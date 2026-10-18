'use server';
import { schema } from '@hub/db';
import { redirect } from 'next/navigation';
import { asUser, requestMeta } from '@/lib/db';
import { pendingLegalDocuments } from '@/lib/legal';
import { safeNext } from '@/lib/safe-next';
import { getContext } from '@/lib/session';
import type { FormState } from './types';

// Records acceptance of every document still pending for this user (recomputed here, never taken from the form).
export async function acceptLegalAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  if (fd.get('agree') !== 'on') return { error: 'legal_required' };
  const meta = await requestMeta();
  await asUser(ctx.claims, async (tx) => {
    const pending = await pendingLegalDocuments(tx, ctx.userId);
    if (!pending.length) return;
    await tx.insert(schema.legalAcceptances).values(
      pending.map((d) => ({
        userId: ctx.userId,
        companyId: ctx.company?.id ?? null,
        documentId: d.id,
        ip: meta.ip && /^[0-9a-f.:]+$/i.test(meta.ip) ? meta.ip : null,
        userAgent: meta.userAgent?.slice(0, 400) ?? null,
      })),
    );
  });
  redirect(safeNext(fd.get('next')));
}
