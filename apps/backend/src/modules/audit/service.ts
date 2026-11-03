import type { Db } from '../../db/client.js';
import { auditLogs } from '../../db/schema.js';
import { newId } from '../../lib/ids.js';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  outcome: 'success' | 'failure';
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  /** Never put passwords, tokens or other secrets here (spec §19.5, §21.2). */
  metadata?: Record<string, unknown>;
}

/** Spec §21.2 audit trail: actor, action, target, timestamp, outcome. */
export function writeAudit(db: Pick<Db, 'insert'>, e: AuditEntry): void {
  db.insert(auditLogs)
    .values({
      id: newId(),
      actorId: e.actorId,
      action: e.action,
      outcome: e.outcome,
      targetType: e.targetType ?? null,
      targetId: e.targetId ?? null,
      ip: e.ip ?? null,
      metadata: e.metadata ?? null,
    })
    .run();
}
