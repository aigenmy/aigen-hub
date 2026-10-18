// AIGen Hub database schema (Phase 0: tenancy, roles, plans/modules, flags, audit, legal).
// Rules (spec §4, §9.4): every company table has company_id NOT NULL with an index leading on it,
// RLS on, policies through the security-definer helpers in schema `private` (migration 0000).
// Privileged changes go through the RPCs and guard triggers in migration 0002, never through the browser.
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { anonRole, authenticatedRole, authUsers } from 'drizzle-orm/supabase';

// ---------- enums ----------
export const memberRole = pgEnum('member_role', ['owner', 'admin', 'agent', 'viewer']);
export const memberStatus = pgEnum('member_status', ['active', 'suspended']);
export const planStatus = pgEnum('plan_status', ['trialing', 'active', 'past_due', 'cancelled', 'suspended']);
export const actorType = pgEnum('actor_type', ['user', 'ai', 'system', 'staff']);
export const moduleState = pgEnum('module_state', ['on', 'off']);
export const legalKind = pgEnum('legal_kind', [
  'terms',
  'privacy',
  'dpa',
  'aup',
  'ai_notice',
  'sla',
  'refund',
  'subprocessors',
  'cookies',
]);

const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// Policy expressions (helpers live in schema `private`, migration 0000_private_helpers.sql).
// `in (select …)` lets Postgres run the helper once per query instead of once per row.
const isStaff = sql`(select private.is_staff())`;
const myCompanies = sql`(select private.my_company_ids())`;
const inMyCompany = (col: unknown) => sql`${col} in ${myCompanies} or ${isStaff}`;
const isCompanyManager = (col: unknown) =>
  sql`(select private.my_role(${col})) in ('owner', 'admin') or ${isStaff}`;

// ---------- reference data (AIGen staff edit in the Console) ----------
export const plans = pgTable(
  'plans',
  {
    id: text('id').primaryKey(), // free | starter | growth | business | enterprise
    sort: integer('sort').notNull().default(0),
    priceMonthlySen: integer('price_monthly_sen').notNull().default(0),
    priceYearlySen: integer('price_yearly_sen').notNull().default(0),
    seatsIncluded: integer('seats_included').notNull(),
    extraSeatSen: integer('extra_seat_sen'),
    aiAssistsMonth: integer('ai_assists_month').notNull().default(0),
    autoMode: boolean('auto_mode').notNull().default(false),
    contactsSoftCap: integer('contacts_soft_cap'),
    knowledgeDocs: integer('knowledge_docs').notNull().default(0),
    whatsappNumbers: integer('whatsapp_numbers').notNull().default(0),
    mailboxes: integer('mailboxes').notNull().default(0),
    auditRetentionDays: integer('audit_retention_days').notNull().default(90),
    isCustom: boolean('is_custom').notNull().default(false), // Enterprise: priced by quote
    isPublic: boolean('is_public').notNull().default(true),
    active: boolean('active').notNull().default(true),
    updatedAt: updated(),
  },
  (t) => [
    check('plans_prices_positive', sql`${t.priceMonthlySen} >= 0 and ${t.priceYearlySen} >= 0`),
    check('plans_seats_positive', sql`${t.seatsIncluded} > 0`),
    pgPolicy('plans_read', { for: 'select', to: [anonRole, authenticatedRole], using: sql`${t.active} or ${isStaff}` }),
    pgPolicy('plans_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const modules = pgTable(
  'modules',
  {
    id: text('id').primaryKey(), // matches packages/modules registry ids
    sort: integer('sort').notNull().default(0),
    addonPriceSen: integer('addon_price_sen'), // null = not sold as an add-on
    enabled: boolean('enabled').notNull().default(true), // global kill switch
    updatedAt: updated(),
  },
  (t) => [
    pgPolicy('modules_read', { for: 'select', to: authenticatedRole, using: sql`true` }),
    pgPolicy('modules_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const planModules = pgTable(
  'plan_modules',
  {
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    moduleId: text('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    limits: jsonb('limits').notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.moduleId] }),
    pgPolicy('plan_modules_read', { for: 'select', to: [anonRole, authenticatedRole], using: sql`true` }),
    pgPolicy('plan_modules_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const platformSettings = pgTable(
  'platform_settings',
  {
    key: text('key').primaryKey(), // billing_enabled, beta_open, ...
    value: jsonb('value').notNull(),
    updatedAt: updated(),
  },
  (t) => [
    pgPolicy('platform_settings_read', { for: 'select', to: authenticatedRole, using: sql`true` }),
    pgPolicy('platform_settings_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const featureFlags = pgTable(
  'feature_flags',
  {
    key: text('key').primaryKey(),
    description: text('description').notNull().default(''),
    enabled: boolean('enabled').notNull().default(false),
    rolloutPercent: integer('rollout_percent').notNull().default(0),
    updatedAt: updated(),
  },
  (t) => [
    check('feature_flags_rollout_range', sql`${t.rolloutPercent} between 0 and 100`),
    pgPolicy('feature_flags_read', { for: 'select', to: authenticatedRole, using: sql`true` }),
    pgPolicy('feature_flags_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

// ---------- people and companies ----------
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    type: text('type').notNull().default('other'),
    locale: text('locale').notNull().default('en'),
    timezone: text('timezone').notNull().default('Asia/Kuala_Lumpur'),
    currency: text('currency').notNull().default('MYR'),
    planId: text('plan_id')
      .notNull()
      .default('free')
      .references(() => plans.id),
    planStatus: planStatus('plan_status').notNull().default('active'),
    seatsLimit: integer('seats_limit').notNull(),
    isFounder: boolean('is_founder').notNull().default(false), // D7 founding customer badge
    isInternal: boolean('is_internal').notNull().default(false), // AIGen's own test / demo companies
    onboarding: jsonb('onboarding').notNull().default(sql`'{}'::jsonb`),
    settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: created(),
    updatedAt: updated(),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('companies_slug_key').on(t.slug),
    check('companies_name_length', sql`char_length(${t.name}) between 1 and 120`),
    check('companies_locale', sql`${t.locale} in ('en', 'ms', 'zh', 'ta')`),
    check('companies_seats_limit', sql`${t.seatsLimit} >= 1`),
    pgPolicy('companies_select', { for: 'select', to: authenticatedRole, using: inMyCompany(t.id) }),
    // Owners/Admins edit name, type, language, settings; plan/seat/status columns are guarded by a trigger (0002).
    pgPolicy('companies_update', {
      for: 'update',
      to: authenticatedRole,
      using: isCompanyManager(t.id),
      withCheck: isCompanyManager(t.id),
    }),
  ],
).enableRLS();

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    email: text('email').notNull().default(''),
    fullName: text('full_name').notNull().default(''),
    avatarUrl: text('avatar_url'),
    locale: text('locale').notNull().default('en'),
    timezone: text('timezone').notNull().default('Asia/Kuala_Lumpur'),
    isStaff: boolean('is_staff').notNull().default(false),
    activeCompanyId: uuid('active_company_id').references(() => companies.id, { onDelete: 'set null' }),
    notificationPrefs: jsonb('notification_prefs').notNull().default(sql`'{}'::jsonb`),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    check('profiles_locale', sql`${t.locale} in ('en', 'ms', 'zh', 'ta')`),
    check('profiles_email_lower', sql`${t.email} = lower(${t.email})`),
    pgPolicy('profiles_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.id} = (select auth.uid()) or (select private.shares_company(${t.id})) or ${isStaff}`,
    }),
    pgPolicy('profiles_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.id} = (select auth.uid())`,
      withCheck: sql`${t.id} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const companyMembers = pgTable(
  'company_members',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    status: memberStatus('status').notNull().default('active'),
    // D6: Owner/Admin/Agent take a seat, Viewer does not; suspended members free their seat.
    takesSeat: boolean('takes_seat')
      .notNull()
      .generatedAlwaysAs(sql`role <> 'viewer' and status = 'active'`),
    canPublish: boolean('can_publish').notNull().default(false),
    canInvoice: boolean('can_invoice').notNull().default(false),
    invitedBy: uuid('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.userId] }),
    index('company_members_user_idx').on(t.userId),
    pgPolicy('company_members_select', { for: 'select', to: authenticatedRole, using: inMyCompany(t.companyId) }),
    // Only last_active_at is granted for update (0002); everything else goes through the member RPCs.
    pgPolicy('company_members_touch_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
      withCheck: sql`${t.userId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: memberRole('role').notNull(),
    tokenHash: text('token_hash').notNull(), // sha256 hex of the link token; the token itself is never stored
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedBy: uuid('accepted_by').references(() => authUsers.id, { onDelete: 'set null' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    invitedBy: uuid('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex('invitations_token_hash_key').on(t.tokenHash),
    index('invitations_company_idx').on(t.companyId, t.createdAt),
    uniqueIndex('invitations_open_email_key')
      .on(t.companyId, t.email)
      .where(sql`accepted_at is null and revoked_at is null`),
    check('invitations_email_lower', sql`${t.email} = lower(${t.email})`),
    check('invitations_not_owner', sql`${t.role} <> 'owner'`),
    pgPolicy('invitations_select', { for: 'select', to: authenticatedRole, using: isCompanyManager(t.companyId) }),
  ],
).enableRLS();

export const companyModules = pgTable(
  'company_modules',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    moduleId: text('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    state: moduleState('state').notNull(),
    priceSen: integer('price_sen'), // per-company price override (null = catalogue price)
    trialUntil: date('trial_until'),
    note: text('note').notNull().default(''),
    updatedBy: uuid('updated_by').references(() => authUsers.id, { onDelete: 'set null' }),
    updatedAt: updated(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.moduleId] }),
    pgPolicy('company_modules_select', { for: 'select', to: authenticatedRole, using: inMyCompany(t.companyId) }),
    pgPolicy('company_modules_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const companyFlags = pgTable(
  'company_flags',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    flagKey: text('flag_key')
      .notNull()
      .references(() => featureFlags.key, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull(),
    updatedAt: updated(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.flagKey] }),
    pgPolicy('company_flags_select', { for: 'select', to: authenticatedRole, using: inMyCompany(t.companyId) }),
    pgPolicy('company_flags_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const companyNotes = pgTable(
  'company_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    authorId: uuid('author_id').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: created(),
  },
  (t) => [
    index('company_notes_company_idx').on(t.companyId, t.createdAt),
    // Staff-only notes in the Console; companies never see them.
    pgPolicy('company_notes_staff', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

// ---------- audit (append-only; spec §4.5) ----------
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    companyId: uuid('company_id'), // null = platform-level (plans, flags, legal)
    actorType: actorType('actor_type').notNull(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(), // e.g. companies.update, member.invite, legal.accept
    objectType: text('object_type').notNull(),
    objectId: text('object_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    impersonatingUserId: uuid('impersonating_user_id'),
    createdAt: created(),
  },
  (t) => [
    index('audit_log_company_idx').on(t.companyId, t.createdAt),
    index('audit_log_actor_idx').on(t.actorId, t.createdAt),
    pgPolicy('audit_log_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(${t.companyId} is not null and (select private.my_role(${t.companyId})) in ('owner', 'admin')) or ${isStaff}`,
    }),
  ],
).enableRLS();

// ---------- legal (spec §8.7; bodies are versioned in packages/legal, snapshotted here on publish) ----------
export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: legalKind('kind').notNull(),
    locale: text('locale').notNull(),
    version: text('version').notNull(),
    title: text('title').notNull(),
    bodyMd: text('body_md').notNull(),
    sha256: text('sha256').notNull(),
    summary: text('summary').notNull().default(''),
    requiresAcceptance: boolean('requires_acceptance').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex('legal_documents_version_key').on(t.kind, t.locale, t.version),
    pgPolicy('legal_documents_read', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`${t.publishedAt} is not null or ${isStaff}`,
    }),
    pgPolicy('legal_documents_staff_write', { for: 'all', to: authenticatedRole, using: isStaff, withCheck: isStaff }),
  ],
).enableRLS();

export const legalAcceptances = pgTable(
  'legal_acceptances',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => legalDocuments.id),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('legal_acceptances_user_idx').on(t.userId, t.documentId),
    index('legal_acceptances_company_idx').on(t.companyId),
    pgPolicy('legal_acceptances_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid()) or (${t.companyId} is not null and (select private.my_role(${t.companyId})) in ('owner', 'admin')) or ${isStaff}`,
    }),
    pgPolicy('legal_acceptances_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.userId} = (select auth.uid()) and (${t.companyId} is null or ${t.companyId} in ${myCompanies})`,
    }),
  ],
).enableRLS();

export type Plan = typeof plans.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type CompanyMember = typeof companyMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type AuditRow = typeof auditLog.$inferSelect;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type MemberRole = (typeof memberRole.enumValues)[number];
export type LegalKind = (typeof legalKind.enumValues)[number];
