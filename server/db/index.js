import { FileStore } from './fileStore.js';
import { PostgresStore } from './postgresStore.js';
import { seedDemoIfNeeded } from './seed.js';

export let store = process.env.DATABASE_URL ? new PostgresStore() : new FileStore();

export async function initDatabase() {
  await store.init();
  await seedDemoIfNeeded(store);
}
