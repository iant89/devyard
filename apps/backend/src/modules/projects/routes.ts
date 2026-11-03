import {
  AddProjectMemberRequest,
  CreateProjectRequest,
  PROJECT_SORT_FIELDS,
  ProjectListQuery,
  TransferOwnershipRequest,
  UpdateProjectMemberRequest,
  UpdateProjectRequest,
} from '@devyard/contracts';
import { and, asc, desc, eq, exists, isNotNull, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { projectMembers, projects } from '../../db/schema.js';
import { ApiError } from '../../lib/errors.js';
import { newId } from '../../lib/ids.js';
import { writeAudit } from '../audit/service.js';
import {
  can,
  effectiveProjectRole,
  PROJECT_ROLE_RANK,
  requireProjectRole,
  type Principal,
} from '../permissions/service.js';
import { findLiveUser } from '../users/service.js';
import {
  capRoleForUser,
  findLiveProject,
  isGlobalViewer,
  listMembers,
  memberRow,
  slugify,
  slugTaken,
  toProject,
  uniqueSlug,
} from './service.js';

const IdParams = z.object({ id: z.string().min(1).max(64) });
const MemberParams = IdParams.extend({ userId: z.string().min(1).max(64) });

const SORT_COLUMNS = {
  name: projects.name,
  slug: projects.slug,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
} satisfies Record<(typeof PROJECT_SORT_FIELDS)[number], unknown>;

function parseSort(sort: string | undefined): SQL {
  if (!sort) return desc(projects.updatedAt);
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  if (!(field in SORT_COLUMNS))
    throw new ApiError('VALIDATION_FAILED', 'Request validation failed', [
      { path: 'sort', message: `sort must be one of ${PROJECT_SORT_FIELDS.join(', ')}` },
    ]);
  const col = SORT_COLUMNS[field as keyof typeof SORT_COLUMNS];
  return descending ? desc(col) : asc(col);
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Spec §6 project management (plan §6.4). Access comes only from project_members (§5.3). */
export const projectsRoutes: FastifyPluginAsync = async (app) => {
  const db = app.db;
  const me = (req: FastifyRequest): Principal => req.auth!.publicUser;
  const audit = (
    req: FastifyRequest,
    action: string,
    projectId: string,
    metadata?: Record<string, unknown>,
  ) =>
    writeAudit(db, {
      actorId: req.auth!.user.id,
      action,
      outcome: 'success',
      targetType: 'project',
      targetId: projectId,
      ip: req.ip,
      ...(metadata ? { metadata } : {}),
    });
  const respond = (p: Principal, projectId: string) => {
    const row = findLiveProject(db, projectId)!;
    return { data: toProject(row, effectiveProjectRole(db, p, projectId) ?? 'viewer') };
  };

  app.get('/', { config: { auth: true } }, async (req) => {
    const q = ProjectListQuery.parse(req.query);
    const p = me(req);
    const isMember = exists(
      db
        .select({ one: sql`1` })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, p.id))),
    );
    const seesAll = can(p, 'projects.read_all') || can(p, 'projects.manage_all');
    const conds: SQL[] = [isNull(projects.deletedAt)];
    if (q.scope === 'mine') conds.push(eq(projects.ownerId, p.id));
    else if (q.scope === 'shared') conds.push(isMember, ne(projects.ownerId, p.id));
    else if (!seesAll) conds.push(isMember);
    conds.push(q.archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt));
    if (q.q) {
      const pat = `%${escapeLike(q.q.toLowerCase())}%`;
      conds.push(
        or(
          sql`lower(${projects.name}) like ${pat} escape '\\'`,
          sql`${projects.slug} like ${pat} escape '\\'`,
          sql`lower(${projects.description}) like ${pat} escape '\\'`,
        )!,
      );
    }
    const where = and(...conds);
    const total =
      db
        .select({ n: sql<number>`count(*)` })
        .from(projects)
        .where(where)
        .get()?.n ?? 0;
    const rows = db
      .select()
      .from(projects)
      .where(where)
      .orderBy(parseSort(q.sort), asc(projects.id))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .all();
    return {
      data: rows.map((r) => toProject(r, effectiveProjectRole(db, p, r.id) ?? 'viewer')),
      meta: { page: q.page, pageSize: q.pageSize, total },
    };
  });

  app.post('/', { config: { permission: 'projects.create' } }, async (req, reply) => {
    const body = CreateProjectRequest.parse(req.body);
    if (body.template !== 'empty')
      throw new ApiError('VALIDATION_FAILED', 'Request validation failed', [
        { path: 'template', message: "Only the 'empty' template is available in this release" },
      ]);
    const p = me(req);
    const id = newId();
    db.transaction((tx) => {
      let slug: string;
      if (body.slug) {
        if (slugTaken(tx, body.slug)) throw new ApiError('CONFLICT', 'Slug already in use');
        slug = body.slug;
      } else slug = uniqueSlug(tx, slugify(body.name));
      tx.insert(projects)
        .values({
          id,
          slug,
          name: body.name,
          description: body.description,
          ownerId: p.id,
          projectType: body.template,
          primaryLanguage: body.primaryLanguage ?? null,
          framework: body.framework ?? null,
        })
        .run();
      tx.insert(projectMembers)
        .values({ projectId: id, userId: p.id, role: 'owner', addedBy: p.id })
        .run();
    });
    audit(req, 'project.create', id, { name: body.name });
    return reply.status(201).send(respond(p, id));
  });

  app.get('/:id', { config: { auth: true } }, async (req) => {
    const { id } = IdParams.parse(req.params);
    requireProjectRole(db, me(req), id, 'viewer');
    return respond(me(req), id);
  });

  app.patch('/:id', { config: { auth: true } }, async (req) => {
    const { id } = IdParams.parse(req.params);
    requireProjectRole(db, me(req), id, 'maintainer');
    const body = UpdateProjectRequest.parse(req.body);
    const before = findLiveProject(db, id)!;
    const now = new Date();
    const patch: Partial<typeof projects.$inferInsert> = { updatedAt: now };
    for (const k of ['name', 'description', 'primaryLanguage', 'framework'] as const)
      if (body[k] !== undefined) (patch as Record<string, unknown>)[k] = body[k];
    if (body.archived !== undefined)
      patch.archivedAt = body.archived ? (before.archivedAt ?? now) : null;
    db.update(projects).set(patch).where(eq(projects.id, id)).run();
    const archiveChange =
      body.archived !== undefined && body.archived !== !!before.archivedAt
        ? body.archived
          ? 'project.archive'
          : 'project.unarchive'
        : null;
    audit(req, archiveChange ?? 'project.update', id, { fields: Object.keys(body) });
    return respond(me(req), id);
  });

  app.delete('/:id', { config: { auth: true } }, async (req, reply) => {
    const { id } = IdParams.parse(req.params);
    requireProjectRole(db, me(req), id, 'owner');
    const now = new Date();
    db.update(projects).set({ deletedAt: now, updatedAt: now }).where(eq(projects.id, id)).run();
    audit(req, 'project.delete', id);
    return reply.status(204).send();
  });

  app.get('/:id/members', { config: { auth: true } }, async (req) => {
    const { id } = IdParams.parse(req.params);
    requireProjectRole(db, me(req), id, 'viewer');
    return { data: listMembers(db, id) };
  });

  app.post('/:id/members', { config: { auth: true } }, async (req, reply) => {
    const { id } = IdParams.parse(req.params);
    const myRole = requireProjectRole(db, me(req), id, 'maintainer');
    const body = AddProjectMemberRequest.parse(req.body);
    if (body.role === 'maintainer' && myRole !== 'owner')
      throw new ApiError('FORBIDDEN', 'Only the owner can add maintainers');
    const target = findLiveUser(db, body.userId);
    if (!target) throw new ApiError('NOT_FOUND', 'User not found');
    if (memberRow(db, id, body.userId)) throw new ApiError('CONFLICT', 'User is already a member');
    const { role, capped } = capRoleForUser(db, body.userId, body.role);
    db.insert(projectMembers)
      .values({ projectId: id, userId: body.userId, role, addedBy: req.auth!.user.id })
      .run();
    audit(req, 'project.member_add', id, {
      userId: body.userId,
      role,
      ...(capped ? { requestedRole: body.role, capped } : {}),
    });
    const m = listMembers(db, id).find((x) => x.userId === body.userId)!;
    return reply.status(201).send({ data: m });
  });

  app.patch('/:id/members/:userId', { config: { auth: true } }, async (req) => {
    const { id, userId } = MemberParams.parse(req.params);
    const myRole = requireProjectRole(db, me(req), id, 'maintainer');
    const body = UpdateProjectMemberRequest.parse(req.body);
    const current = memberRow(db, id, userId);
    if (!current) throw new ApiError('NOT_FOUND', 'Member not found');
    if (current.role === 'owner')
      throw new ApiError('CONFLICT', "The owner's role can only change through a transfer");
    if ((current.role === 'maintainer' || body.role === 'maintainer') && myRole !== 'owner')
      throw new ApiError('FORBIDDEN', 'Only the owner can change maintainers');
    const { role, capped } = capRoleForUser(db, userId, body.role);
    db.update(projectMembers)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))
      .run();
    audit(req, 'project.member_update', id, {
      userId,
      from: current.role,
      role,
      ...(capped ? { requestedRole: body.role, capped } : {}),
    });
    return { data: listMembers(db, id).find((x) => x.userId === userId)! };
  });

  app.delete('/:id/members/:userId', { config: { auth: true } }, async (req, reply) => {
    const { id, userId } = MemberParams.parse(req.params);
    const p = me(req);
    const myRole = requireProjectRole(db, p, id, 'viewer');
    const current = memberRow(db, id, userId);
    const leaving = userId === p.id;
    if (!leaving && PROJECT_ROLE_RANK[myRole] < PROJECT_ROLE_RANK.maintainer)
      throw new ApiError('FORBIDDEN', 'Insufficient project role');
    if (!current) throw new ApiError('NOT_FOUND', 'Member not found');
    if (current.role === 'owner')
      throw new ApiError('CONFLICT', 'The owner cannot be removed; transfer ownership first');
    if (!leaving && current.role === 'maintainer' && myRole !== 'owner')
      throw new ApiError('FORBIDDEN', 'Only the owner can remove maintainers');
    db.delete(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))
      .run();
    audit(req, leaving ? 'project.member_leave' : 'project.member_remove', id, {
      userId,
      role: current.role,
    });
    return reply.status(204).send();
  });

  app.post('/:id/transfer', { config: { auth: true } }, async (req) => {
    const { id } = IdParams.parse(req.params);
    requireProjectRole(db, me(req), id, 'owner');
    const { newOwnerId } = TransferOwnershipRequest.parse(req.body);
    const project = findLiveProject(db, id)!;
    const target = findLiveUser(db, newOwnerId);
    if (!target) throw new ApiError('NOT_FOUND', 'User not found');
    const invalid = (message: string) =>
      new ApiError('VALIDATION_FAILED', message, [{ path: 'newOwnerId', message }]);
    if (target.status !== 'active') throw invalid('The new owner must be an active user');
    if (isGlobalViewer(db, newOwnerId)) throw invalid('Global viewers cannot own projects');
    if (newOwnerId === project.ownerId) throw invalid('That user already owns the project');
    const prevOwner = project.ownerId;
    db.transaction((tx) => {
      const now = new Date();
      tx.update(projects)
        .set({ ownerId: newOwnerId, updatedAt: now })
        .where(eq(projects.id, id))
        .run();
      tx.insert(projectMembers)
        .values({ projectId: id, userId: newOwnerId, role: 'owner', addedBy: req.auth!.user.id })
        .onConflictDoUpdate({
          target: [projectMembers.projectId, projectMembers.userId],
          set: { role: 'owner', updatedAt: now },
        })
        .run();
      tx.update(projectMembers)
        .set({ role: 'maintainer', updatedAt: now })
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, prevOwner)))
        .run();
    });
    audit(req, 'project.transfer', id, { from: prevOwner, to: newOwnerId });
    return respond(me(req), id);
  });
};
