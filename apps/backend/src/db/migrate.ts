import { loadConfig } from '../config/index.js';
import { openDatabase, runMigrations } from './client.js';
import { seedRbac } from './seed.js';

const config = loadConfig();
const { db, sqlite } = openDatabase(config.dbPath);
runMigrations(db);
seedRbac(db);
sqlite.close();
console.log(`migrated ${config.dbPath}`);
