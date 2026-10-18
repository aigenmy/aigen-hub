// Starts the local Postgres (if needed) and builds a fresh `hub_test` database from the shim + all migrations.
import type { TestProject } from 'vitest/node';
import { prepareDatabase, startLocalPostgres } from '../src/local';

export default async function setup(project: TestProject) {
  const { port } = await startLocalPostgres();
  const url = await prepareDatabase('hub_test', port, { recreate: true });
  project.provide('dbUrl', url);
}

declare module 'vitest' {
  export interface ProvidedContext {
    dbUrl: string;
  }
}
