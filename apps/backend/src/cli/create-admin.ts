import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { BootstrapRequest } from '@devyard/contracts';
import { eq, or } from 'drizzle-orm';
import { loadConfig } from '../config/index.js';
import { openDatabase, runMigrations, type Db } from '../db/client.js';
import { userRoles, users } from '../db/schema.js';
import { seedRbac } from '../db/seed.js';
import { hashPassword } from '../lib/crypto.js';
import { newId } from '../lib/ids.js';
import { writeAudit } from '../modules/audit/service.js';

/** Recovery path (plan §5.8): create an admin directly in the database. */
export async function createAdmin(
  db: Db,
  input: { username: string; email: string; displayName: string; password: string },
): Promise<{ id: string }> {
  const body = BootstrapRequest.parse({
    ...input,
    username: input.username.toLowerCase(),
    email: input.email.toLowerCase(),
  });
  const passwordHash = await hashPassword(body.password);
  const now = new Date();
  return db.transaction((tx) => {
    const clash = tx
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, body.username), eq(users.email, body.email)))
      .get();
    if (clash)
      throw new Error(
        'A user with that username or email already exists (soft-deleted users keep their username and email reserved)',
      );
    const id = newId();
    tx.insert(users)
      .values({
        id,
        username: body.username,
        email: body.email,
        displayName: body.displayName,
        passwordHash,
        passwordChangedAt: now,
      })
      .run();
    tx.insert(userRoles).values({ userId: id, roleId: 'admin' }).run();
    writeAudit(tx, {
      actorId: null,
      action: 'cli.create_admin',
      outcome: 'success',
      targetType: 'user',
      targetId: id,
    });
    return { id };
  });
}

async function readPassword(): Promise<string> {
  if (process.env.DEVYARD_ADMIN_PASSWORD) return process.env.DEVYARD_ADMIN_PASSWORD;
  if (process.stdin.isTTY)
    throw new Error('Set DEVYARD_ADMIN_PASSWORD or pipe the password on stdin');
  let data = '';
  for await (const chunk of process.stdin) data += String(chunk);
  return data.replace(/\r?\n$/, '');
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      username: { type: 'string' },
      email: { type: 'string' },
      'display-name': { type: 'string' },
    },
  });
  if (!values.username || !values.email) {
    console.error(
      'usage: npm run user:create-admin -- --username <name> --email <email> [--display-name <name>]\n' +
        '       password via DEVYARD_ADMIN_PASSWORD or stdin',
    );
    process.exit(2);
  }
  const config = loadConfig();
  const { db, sqlite } = openDatabase(config.dbPath);
  try {
    runMigrations(db);
    seedRbac(db);
    const { id } = await createAdmin(db, {
      username: values.username,
      email: values.email,
      displayName: values['display-name'] ?? values.username,
      password: await readPassword(),
    });
    console.log(`created admin ${values.username.toLowerCase()} (${id})`);
  } finally {
    sqlite.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
