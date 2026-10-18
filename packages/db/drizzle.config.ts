import { defineConfig } from 'drizzle-kit';

// Migrations are generated from src/schema.ts plus hand-written custom SQL files (helpers, RPCs, triggers, grants).
// drizzle-kit only manages the `public` schema; `auth` belongs to Supabase (a local shim stands in for it in tests).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  schemaFilter: ['public'],
  entities: { roles: { provider: 'supabase' } },
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/hub' },
});
