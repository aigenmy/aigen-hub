CREATE TYPE "public"."actor_type" AS ENUM('user', 'ai', 'system', 'staff');--> statement-breakpoint
CREATE TYPE "public"."legal_kind" AS ENUM('terms', 'privacy', 'dpa', 'aup', 'ai_notice', 'sla', 'refund', 'subprocessors', 'cookies');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'agent', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."module_state" AS ENUM('on', 'off');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"company_id" uuid,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip" "inet",
	"user_agent" text,
	"impersonating_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kuala_Lumpur' NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"plan_id" text DEFAULT 'free' NOT NULL,
	"plan_status" "plan_status" DEFAULT 'active' NOT NULL,
	"seats_limit" integer NOT NULL,
	"is_founder" boolean DEFAULT false NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"onboarding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"suspended_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "companies_name_length" CHECK (char_length("companies"."name") between 1 and 120),
	CONSTRAINT "companies_locale" CHECK ("companies"."locale" in ('en', 'ms', 'zh', 'ta')),
	CONSTRAINT "companies_seats_limit" CHECK ("companies"."seats_limit" >= 1)
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_flags" (
	"company_id" uuid NOT NULL,
	"flag_key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_flags_company_id_flag_key_pk" PRIMARY KEY("company_id","flag_key")
);
--> statement-breakpoint
ALTER TABLE "company_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_members" (
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"takes_seat" boolean GENERATED ALWAYS AS (role <> 'viewer' and status = 'active') STORED NOT NULL,
	"can_publish" boolean DEFAULT false NOT NULL,
	"can_invoice" boolean DEFAULT false NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone,
	CONSTRAINT "company_members_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "company_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_modules" (
	"company_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"state" "module_state" NOT NULL,
	"price_sen" integer,
	"trial_until" date,
	"note" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_modules_company_id_module_id_pk" PRIMARY KEY("company_id","module_id")
);
--> statement-breakpoint
ALTER TABLE "company_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percent" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_rollout_range" CHECK ("feature_flags"."rollout_percent" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" uuid,
	"revoked_at" timestamp with time zone,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_email_lower" CHECK ("invitations"."email" = lower("invitations"."email")),
	CONSTRAINT "invitations_not_owner" CHECK ("invitations"."role" <> 'owner')
);
--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legal_acceptances" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legal_acceptances_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"document_id" uuid NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_acceptances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "legal_kind" NOT NULL,
	"locale" text NOT NULL,
	"version" text NOT NULL,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"sha256" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"requires_acceptance" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"addon_price_sen" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_modules" (
	"plan_id" text NOT NULL,
	"module_id" text NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "plan_modules_plan_id_module_id_pk" PRIMARY KEY("plan_id","module_id")
);
--> statement-breakpoint
ALTER TABLE "plan_modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"price_monthly_sen" integer DEFAULT 0 NOT NULL,
	"price_yearly_sen" integer DEFAULT 0 NOT NULL,
	"seats_included" integer NOT NULL,
	"extra_seat_sen" integer,
	"ai_assists_month" integer DEFAULT 0 NOT NULL,
	"auto_mode" boolean DEFAULT false NOT NULL,
	"contacts_soft_cap" integer,
	"knowledge_docs" integer DEFAULT 0 NOT NULL,
	"whatsapp_numbers" integer DEFAULT 0 NOT NULL,
	"mailboxes" integer DEFAULT 0 NOT NULL,
	"audit_retention_days" integer DEFAULT 90 NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_prices_positive" CHECK ("plans"."price_monthly_sen" >= 0 and "plans"."price_yearly_sen" >= 0),
	CONSTRAINT "plans_seats_positive" CHECK ("plans"."seats_included" > 0)
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kuala_Lumpur' NOT NULL,
	"is_staff" boolean DEFAULT false NOT NULL,
	"active_company_id" uuid,
	"notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_locale" CHECK ("profiles"."locale" in ('en', 'ms', 'zh', 'ta')),
	CONSTRAINT "profiles_email_lower" CHECK ("profiles"."email" = lower("profiles"."email"))
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_flags" ADD CONSTRAINT "company_flags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_flags" ADD CONSTRAINT "company_flags_flag_key_feature_flags_key_fk" FOREIGN KEY ("flag_key") REFERENCES "public"."feature_flags"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notes" ADD CONSTRAINT "company_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notes" ADD CONSTRAINT "company_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_active_company_id_companies_id_fk" FOREIGN KEY ("active_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_company_idx" ON "audit_log" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_key" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "company_members_user_idx" ON "company_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_notes_company_idx" ON "company_notes" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invitations_company_idx" ON "invitations" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_open_email_key" ON "invitations" USING btree ("company_id","email") WHERE accepted_at is null and revoked_at is null;--> statement-breakpoint
CREATE INDEX "legal_acceptances_user_idx" ON "legal_acceptances" USING btree ("user_id","document_id");--> statement-breakpoint
CREATE INDEX "legal_acceptances_company_idx" ON "legal_acceptances" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_version_key" ON "legal_documents" USING btree ("kind","locale","version");--> statement-breakpoint
CREATE POLICY "audit_log_select" ON "audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("audit_log"."company_id" is not null and (select private.my_role("audit_log"."company_id")) in ('owner', 'admin')) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "companies_select" ON "companies" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("companies"."id" in (select private.my_company_ids()) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "companies_update" ON "companies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.my_role("companies"."id")) in ('owner', 'admin') or (select private.is_staff())) WITH CHECK ((select private.my_role("companies"."id")) in ('owner', 'admin') or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "company_flags_select" ON "company_flags" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("company_flags"."company_id" in (select private.my_company_ids()) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "company_flags_staff_write" ON "company_flags" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "company_members_select" ON "company_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("company_members"."company_id" in (select private.my_company_ids()) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "company_members_touch_own" ON "company_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("company_members"."user_id" = (select auth.uid())) WITH CHECK ("company_members"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "company_modules_select" ON "company_modules" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("company_modules"."company_id" in (select private.my_company_ids()) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "company_modules_staff_write" ON "company_modules" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "company_notes_staff" ON "company_notes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "feature_flags_read" ON "feature_flags" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "feature_flags_staff_write" ON "feature_flags" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "invitations_select" ON "invitations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.my_role("invitations"."company_id")) in ('owner', 'admin') or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "legal_acceptances_select" ON "legal_acceptances" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("legal_acceptances"."user_id" = (select auth.uid()) or ("legal_acceptances"."company_id" is not null and (select private.my_role("legal_acceptances"."company_id")) in ('owner', 'admin')) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "legal_acceptances_insert_own" ON "legal_acceptances" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("legal_acceptances"."user_id" = (select auth.uid()) and ("legal_acceptances"."company_id" is null or "legal_acceptances"."company_id" in (select private.my_company_ids())));--> statement-breakpoint
CREATE POLICY "legal_documents_read" ON "legal_documents" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("legal_documents"."published_at" is not null or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "legal_documents_staff_write" ON "legal_documents" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "modules_read" ON "modules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "modules_staff_write" ON "modules" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "plan_modules_read" ON "plan_modules" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "plan_modules_staff_write" ON "plan_modules" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "plans_read" ON "plans" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("plans"."active" or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "plans_staff_write" ON "plans" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "platform_settings_read" ON "platform_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "platform_settings_staff_write" ON "platform_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select private.is_staff())) WITH CHECK ((select private.is_staff()));--> statement-breakpoint
CREATE POLICY "profiles_select" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = (select auth.uid()) or (select private.shares_company("profiles"."id")) or (select private.is_staff()));--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = (select auth.uid())) WITH CHECK ("profiles"."id" = (select auth.uid()));