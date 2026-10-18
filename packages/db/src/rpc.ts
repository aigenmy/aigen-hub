// Typed wrappers for the rules-layer RPCs in migration 0002. Call them inside withClaims().
import { createHash, randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Tx } from './client';
import type { MemberRole } from './schema';

type Row = Record<string, unknown>;
const first = async (q: Promise<unknown>) => ((await q) as Row[])[0] ?? {};

export const hashToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');
export const newInviteToken = () => randomBytes(32).toString('base64url');

export async function createCompany(tx: Tx, name: string, type: string, locale: string) {
  const r = await first(tx.execute(sql`select public.create_company(${name}, ${type}, ${locale}) as id`));
  return r.id as string;
}

// Returns the raw token for the invitation link; only its hash is stored.
export async function createInvitation(tx: Tx, companyId: string, email: string, role: Exclude<MemberRole, 'owner'>) {
  const token = newInviteToken();
  const r = await first(
    tx.execute(sql`select public.create_invitation(${companyId}::uuid, ${email}, ${role}::public.member_role, ${hashToken(token)}) as id`),
  );
  return { id: r.id as string, token };
}

export type InvitationPreview = {
  companyName: string | null;
  role: MemberRole | null;
  status: 'open' | 'invalid' | 'revoked' | 'accepted' | 'expired';
  emailMatches: boolean;
};

export async function previewInvitation(tx: Tx, token: string): Promise<InvitationPreview> {
  const r = await first(
    tx.execute(sql`select company_name, role, status, email_matches from public.invitation_preview(${hashToken(token)})`),
  );
  return {
    companyName: (r.company_name as string | null) ?? null,
    role: (r.role as MemberRole | null) ?? null,
    status: (r.status as InvitationPreview['status']) ?? 'invalid',
    emailMatches: Boolean(r.email_matches),
  };
}

export async function acceptInvitation(tx: Tx, token: string) {
  const r = await first(tx.execute(sql`select public.accept_invitation(${hashToken(token)}) as id`));
  return r.id as string;
}

export async function revokeInvitation(tx: Tx, invitationId: string) {
  await tx.execute(sql`select public.revoke_invitation(${invitationId}::uuid)`);
}

export async function changeMemberRole(tx: Tx, companyId: string, userId: string, role: MemberRole) {
  await tx.execute(sql`select public.change_member_role(${companyId}::uuid, ${userId}::uuid, ${role}::public.member_role)`);
}

export async function setMemberStatus(tx: Tx, companyId: string, userId: string, status: 'active' | 'suspended') {
  await tx.execute(sql`select public.set_member_status(${companyId}::uuid, ${userId}::uuid, ${status}::public.member_status)`);
}

export async function removeMember(tx: Tx, companyId: string, userId: string) {
  await tx.execute(sql`select public.remove_member(${companyId}::uuid, ${userId}::uuid)`);
}

export async function seatsCommitted(tx: Tx, companyId: string) {
  const r = await first(tx.execute(sql`select private.seats_committed(${companyId}::uuid) as n`));
  return Number(r.n ?? 0);
}
