import 'server-only';
// Read helpers shared by pages. All run inside asUser(), so RLS limits them to what this person may see.
import { schema, type Tx } from '@hub/db';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';

export async function seatsUsed(tx: Tx, companyId: string) {
  const [r] = await tx
    .select({ n: count() })
    .from(schema.companyMembers)
    .where(and(eq(schema.companyMembers.companyId, companyId), eq(schema.companyMembers.takesSeat, true)));
  return r?.n ?? 0;
}

export async function members(tx: Tx, companyId: string) {
  return tx
    .select({
      userId: schema.companyMembers.userId,
      role: schema.companyMembers.role,
      status: schema.companyMembers.status,
      takesSeat: schema.companyMembers.takesSeat,
      joinedAt: schema.companyMembers.joinedAt,
      lastActiveAt: schema.companyMembers.lastActiveAt,
      fullName: schema.profiles.fullName,
      email: schema.profiles.email,
      avatarUrl: schema.profiles.avatarUrl,
    })
    .from(schema.companyMembers)
    .innerJoin(schema.profiles, eq(schema.profiles.id, schema.companyMembers.userId))
    .where(eq(schema.companyMembers.companyId, companyId))
    .orderBy(schema.companyMembers.joinedAt);
}

export async function openInvitations(tx: Tx, companyId: string) {
  return tx
    .select({
      id: schema.invitations.id,
      email: schema.invitations.email,
      role: schema.invitations.role,
      expiresAt: schema.invitations.expiresAt,
      createdAt: schema.invitations.createdAt,
      invitedByName: schema.profiles.fullName,
    })
    .from(schema.invitations)
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.invitations.invitedBy))
    .where(
      and(
        eq(schema.invitations.companyId, companyId),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
        gt(schema.invitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.invitations.createdAt));
}

export async function activity(tx: Tx, companyId: string, limit = 100) {
  return tx
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      actorType: schema.auditLog.actorType,
      actorId: schema.auditLog.actorId,
      objectType: schema.auditLog.objectType,
      objectId: schema.auditLog.objectId,
      before: schema.auditLog.before,
      after: schema.auditLog.after,
      createdAt: schema.auditLog.createdAt,
      actorName: schema.profiles.fullName,
    })
    .from(schema.auditLog)
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.auditLog.actorId))
    .where(eq(schema.auditLog.companyId, companyId))
    .orderBy(desc(schema.auditLog.createdAt), desc(schema.auditLog.id))
    .limit(limit);
}
