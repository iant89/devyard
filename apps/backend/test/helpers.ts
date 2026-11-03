import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';

export function testConfig() {
  return loadConfig({ NODE_ENV: 'test', DEVYARD_DB_PATH: ':memory:', DEVYARD_LOG_LEVEL: 'silent' });
}

export async function testApp() {
  return buildApp(testConfig());
}
