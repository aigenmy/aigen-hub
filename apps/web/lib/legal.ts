import 'server-only';
import { schema, type Tx } from '@hub/db';
import { sql } from 'drizzle-orm';

type Row = Record<string, unknown>;

export type PendingDoc = { id: string; kind: string; version: string; title: string; publishedAt: Date };

/** The newest published version of every document that needs acceptance, which this user has not accepted yet. */
export async function pendingLegalDocuments(tx: Tx, userId: string): Promise<PendingDoc[]> {
  const rows = (await tx.execute(sql`
    with latest as (
      select distinct on (kind) id, kind, version, title, published_at
        from ${schema.legalDocuments}
       where published_at is not null and requires_acceptance and locale = 'en'
       order by kind, published_at desc)
    select l.* from latest l
     where not exists (
       select 1 from ${schema.legalAcceptances} a
         join ${schema.legalDocuments} d on d.id = a.document_id
        where a.user_id = ${userId} and d.kind = l.kind and d.version = l.version)
     order by array_position(array['terms','privacy','dpa','aup','ai_notice']::text[], l.kind::text)`)) as unknown as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    version: r.version as string,
    title: r.title as string,
    publishedAt: new Date(r.published_at as string),
  }));
}
