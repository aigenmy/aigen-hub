// Applies migrations/ to DATABASE_URL (Supabase: the direct connection, port 5432, as postgres).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const here = path.dirname(fileURLToPath(import.meta.url));
export const migrationsFolder = path.resolve(here, '..', 'migrations');

export async function runMigrations(url: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Locally, pnpm db:local:start migrates for you.');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log('Migrations applied.'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
