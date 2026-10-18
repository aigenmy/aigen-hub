-- Rules that RLS alone cannot express: explicit grants, guard triggers, audit triggers, append-only tables,
-- profile creation from auth.users, and the member/invitation RPCs (spec §4.2, §4.3, §4.5).
-- Errors raised here use stable codes in the message ('hub:<code>') that the app maps to translated text.

-- ---------- grants (never rely on Supabase's default "grant all to anon/authenticated") ----------
revoke all on all tables in schema public from anon, authenticated;
--> statement-breakpoint
grant select on public.plans, public.plan_modules, public.legal_documents to anon;
--> statement-breakpoint
grant select on public.plans, public.modules, public.plan_modules, public.platform_settings, public.feature_flags,
  public.companies, public.profiles, public.company_members, public.invitations, public.company_modules,
  public.company_flags, public.company_notes, public.audit_log, public.legal_documents, public.legal_acceptances
  to authenticated;
--> statement-breakpoint
-- Staff-only tables: RLS policies allow writes only when private.is_staff() (profile flag + MFA).
grant insert, update, delete on public.plans, public.modules, public.plan_modules, public.platform_settings,
  public.feature_flags, public.company_modules, public.company_flags, public.company_notes, public.legal_documents
  to authenticated;
--> statement-breakpoint
-- Owners/Admins edit these company columns; the plan/seat/status columns are allowed only for staff (guard trigger below).
grant update (name, type, locale, timezone, settings, onboarding, plan_id, plan_status, seats_limit, is_founder,
  is_internal, suspended_at) on public.companies to authenticated;
--> statement-breakpoint
grant update (full_name, avatar_url, locale, timezone, notification_prefs, active_company_id) on public.profiles to authenticated;
--> statement-breakpoint
grant update (last_active_at) on public.company_members to authenticated;
--> statement-breakpoint
-- Insert on the whole row (the ORM names every column); RLS limits rows to the user's own, and the
-- trigger below stamps accepted_at so nobody can back-date an acceptance.
grant insert on public.legal_acceptances to authenticated;
--> statement-breakpoint
grant all on all tables in schema public to service_role;
--> statement-breakpoint
grant usage, select on all sequences in schema public to authenticated, service_role;
--> statement-breakpoint

-- ---------- updated_at ----------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
--> statement-breakpoint
create trigger plans_touch before update on public.plans for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger modules_touch before update on public.modules for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger platform_settings_touch before update on public.platform_settings for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger feature_flags_touch before update on public.feature_flags for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger companies_touch before update on public.companies for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger company_modules_touch before update on public.company_modules for each row execute function private.touch_updated_at();
--> statement-breakpoint
create trigger company_flags_touch before update on public.company_flags for each row execute function private.touch_updated_at();
--> statement-breakpoint

-- ---------- guards ----------
-- Plan, seats, status and internal flags of a company change only through AIGen staff (or server code / RPCs).
create or replace function private.guard_company_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not private.is_staff() then
    if new.plan_id is distinct from old.plan_id
       or new.plan_status is distinct from old.plan_status
       or new.seats_limit is distinct from old.seats_limit
       or new.is_founder is distinct from old.is_founder
       or new.is_internal is distinct from old.is_internal
       or new.suspended_at is distinct from old.suspended_at then
      raise exception 'hub:staff_only' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger companies_guard before update on public.companies for each row execute function private.guard_company_update();
--> statement-breakpoint

-- Members may only point their active company at a company they belong to.
create or replace function private.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.active_company_id is not null
       and new.active_company_id is distinct from old.active_company_id
       and not (new.active_company_id in (select private.my_company_ids()) or private.is_staff()) then
      raise exception 'hub:not_a_member' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger profiles_guard before update on public.profiles for each row execute function private.guard_profile_update();
--> statement-breakpoint

-- ---------- audit (append-only) ----------
-- TG_ARGV[0] = column holding the company id ('' for platform tables), TG_ARGV[1] = column holding the object id.
create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_company uuid;
  v_actor uuid := (select auth.uid());
  v_actor_type public.actor_type;
  v_object text;
begin
  if tg_op <> 'INSERT' then v_before := to_jsonb(old) - 'token_hash'; end if;
  if tg_op <> 'DELETE' then v_after := to_jsonb(new) - 'token_hash'; end if;

  -- Ignore pure "last seen" / timestamp touches.
  if tg_op = 'UPDATE'
     and (v_before - 'last_active_at' - 'updated_at') = (v_after - 'last_active_at' - 'updated_at') then
    return null;
  end if;

  if tg_argv[0] <> '' then
    v_company := coalesce(v_after ->> tg_argv[0], v_before ->> tg_argv[0])::uuid;
  end if;
  v_object := coalesce(v_after ->> tg_argv[1], v_before ->> tg_argv[1]);

  if v_actor is null then
    v_actor_type := 'system';
  elsif private.is_staff() and (v_company is null or v_company not in (select private.my_company_ids())) then
    v_actor_type := 'staff';
  else
    v_actor_type := 'user';
  end if;

  insert into public.audit_log (company_id, actor_type, actor_id, action, object_type, object_id, before, after,
                                ip, user_agent, impersonating_user_id)
  values (v_company, v_actor_type, v_actor, tg_table_name || '.' || lower(tg_op), tg_table_name, v_object,
          v_before, v_after,
          nullif(current_setting('hub.ip', true), '')::inet,
          nullif(current_setting('hub.user_agent', true), ''),
          nullif(current_setting('hub.impersonating', true), '')::uuid);
  return null;
end;
$$;
--> statement-breakpoint
create trigger companies_audit after insert or update or delete on public.companies for each row execute function private.audit_row('id', 'id');
--> statement-breakpoint
create trigger company_members_audit after insert or update or delete on public.company_members for each row execute function private.audit_row('company_id', 'user_id');
--> statement-breakpoint
create trigger invitations_audit after insert or update or delete on public.invitations for each row execute function private.audit_row('company_id', 'email');
--> statement-breakpoint
create trigger company_modules_audit after insert or update or delete on public.company_modules for each row execute function private.audit_row('company_id', 'module_id');
--> statement-breakpoint
create trigger company_flags_audit after insert or update or delete on public.company_flags for each row execute function private.audit_row('company_id', 'flag_key');
--> statement-breakpoint
create trigger plans_audit after insert or update or delete on public.plans for each row execute function private.audit_row('', 'id');
--> statement-breakpoint
create trigger plan_modules_audit after insert or update or delete on public.plan_modules for each row execute function private.audit_row('', 'plan_id');
--> statement-breakpoint
create trigger modules_audit after insert or update or delete on public.modules for each row execute function private.audit_row('', 'id');
--> statement-breakpoint
create trigger feature_flags_audit after insert or update or delete on public.feature_flags for each row execute function private.audit_row('', 'key');
--> statement-breakpoint
create trigger platform_settings_audit after insert or update or delete on public.platform_settings for each row execute function private.audit_row('', 'key');
--> statement-breakpoint
create trigger legal_documents_audit after insert or update or delete on public.legal_documents for each row execute function private.audit_row('', 'id');
--> statement-breakpoint

-- audit_log and legal_acceptances are append-only for every role. The retention job sets hub.audit_purge = on.
create or replace function private.append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('hub.audit_purge', true), '') = 'on' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'hub:append_only' using errcode = '42501';
end;
$$;
--> statement-breakpoint
create or replace function private.stamp_acceptance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.accepted_at := now();
  return new;
end;
$$;
--> statement-breakpoint
create trigger legal_acceptances_stamp before insert on public.legal_acceptances for each row execute function private.stamp_acceptance();
--> statement-breakpoint
create trigger audit_log_append_only before update or delete on public.audit_log for each row execute function private.append_only();
--> statement-breakpoint
create trigger legal_acceptances_append_only before update or delete on public.legal_acceptances for each row execute function private.append_only();
--> statement-breakpoint
revoke update, delete, truncate on public.audit_log, public.legal_acceptances from anon, authenticated, service_role;
--> statement-breakpoint

-- ---------- profiles from auth.users ----------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'en');
begin
  if v_locale not in ('en', 'ms', 'zh', 'ta') then v_locale := 'en'; end if;
  insert into public.profiles (id, email, full_name, avatar_url, locale)
  values (new.id,
          lower(coalesce(new.email, '')),
          left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120),
          new.raw_user_meta_data ->> 'avatar_url',
          v_locale)
  on conflict (id) do nothing;
  return new;
end;
$$;
--> statement-breakpoint
-- Supabase may refuse triggers on auth.users for the migration role; then public.ensure_profile() (below) is the path.
do $$
begin
  create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
exception when insufficient_privilege then
  raise notice 'auth.users trigger not allowed here; profiles are created by public.ensure_profile()';
end
$$;
--> statement-breakpoint
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(coalesce(new.email, '')) where id = new.id;
  return new;
end;
$$;
--> statement-breakpoint
do $$
begin
  create trigger on_auth_user_email_changed after update of email on auth.users for each row
    when (old.email is distinct from new.email) execute function private.handle_user_email_change();
exception when insufficient_privilege then
  raise notice 'auth.users email trigger not allowed here';
end
$$;
--> statement-breakpoint

-- Safety net: creates the caller's profile if the auth.users trigger did not (the app calls it when a profile is missing).
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users%rowtype;
  v_locale text;
begin
  select * into v_user from auth.users where id = (select auth.uid());
  if not found then return; end if;
  v_locale := coalesce(v_user.raw_user_meta_data ->> 'locale', 'en');
  if v_locale not in ('en', 'ms', 'zh', 'ta') then v_locale := 'en'; end if;
  insert into public.profiles (id, email, full_name, avatar_url, locale)
  values (v_user.id,
          lower(coalesce(v_user.email, '')),
          left(coalesce(v_user.raw_user_meta_data ->> 'full_name', v_user.raw_user_meta_data ->> 'name', ''), 120),
          v_user.raw_user_meta_data ->> 'avatar_url',
          v_locale)
  on conflict (id) do nothing;
end;
$$;
--> statement-breakpoint
revoke all on function public.ensure_profile() from public, anon;
--> statement-breakpoint
grant execute on function public.ensure_profile() to authenticated;
--> statement-breakpoint

-- ---------- seats ----------
-- Seats in use plus seats promised to open invitations (Viewers never count; D6).
create or replace function private.seats_committed(p_company uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select count(*) from public.company_members m where m.company_id = p_company and m.takes_seat)
       + (select count(*) from public.invitations i
           where i.company_id = p_company and i.role <> 'viewer'
             and i.accepted_at is null and i.revoked_at is null and i.expires_at > now());
end;
$$;
--> statement-breakpoint

-- ---------- RPCs (security definer; each checks the caller itself) ----------
create or replace function public.create_company(p_name text, p_type text default 'other', p_locale text default 'en')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text;
  v_seats integer;
  v_id uuid;
begin
  if v_user is null then raise exception 'hub:not_authenticated' using errcode = '42501'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'hub:company_name_invalid' using errcode = '22023'; end if;
  if p_locale not in ('en', 'ms', 'zh', 'ta') then p_locale := 'en'; end if;
  if (select count(*) from public.company_members m where m.user_id = v_user and m.role = 'owner') >= 5 then
    raise exception 'hub:too_many_companies' using errcode = '54000';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'company'; end if;
  v_slug := left(v_slug, 40) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  select p.seats_included into v_seats from public.plans p where p.id = 'free';

  insert into public.companies (name, slug, type, locale, plan_id, plan_status, seats_limit, created_by)
  values (v_name, v_slug, left(coalesce(p_type, 'other'), 40), p_locale, 'free', 'active', coalesce(v_seats, 2), v_user)
  returning id into v_id;

  insert into public.company_members (company_id, user_id, role) values (v_id, v_user, 'owner');
  update public.profiles set active_company_id = v_id where id = v_user;
  return v_id;
end;
$$;
--> statement-breakpoint

create or replace function public.create_invitation(p_company uuid, p_email text, p_role public.member_role, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_role text := private.my_role(p_company);
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_limit integer;
  v_id uuid;
begin
  if v_user is null then raise exception 'hub:not_authenticated' using errcode = '42501'; end if;
  if v_role is null or v_role not in ('owner', 'admin') then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  if p_role = 'owner' then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  if v_role = 'admin' and p_role = 'admin' then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'hub:email_invalid' using errcode = '22023';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'hub:token_invalid' using errcode = '22023'; end if;
  if exists (select 1 from public.company_members m join public.profiles pr on pr.id = m.user_id
              where m.company_id = p_company and pr.email = v_email) then
    raise exception 'hub:already_member' using errcode = '23505';
  end if;

  -- A new invitation to the same address replaces the open one.
  update public.invitations set revoked_at = now()
   where company_id = p_company and email = v_email and accepted_at is null and revoked_at is null;

  select c.seats_limit into v_limit from public.companies c where c.id = p_company;
  if p_role <> 'viewer' and private.seats_committed(p_company) + 1 > v_limit then
    raise exception 'hub:seat_limit' using errcode = '54000';
  end if;

  insert into public.invitations (company_id, email, role, token_hash, expires_at, invited_by)
  values (p_company, v_email, p_role, p_token_hash, now() + interval '7 days', v_user)
  returning id into v_id;
  return v_id;
end;
$$;
--> statement-breakpoint

-- Invitation preview for the accept page (company name, role, whether it is still valid). Never returns the email.
create or replace function public.invitation_preview(p_token_hash text)
returns table (company_name text, role public.member_role, status text, email_matches boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inv public.invitations%rowtype;
  v_email text;
begin
  select * into v_inv from public.invitations where token_hash = p_token_hash;
  if not found then
    return query select null::text, null::public.member_role, 'invalid'::text, false;
    return;
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = (select auth.uid());
  return query
    select c.name, v_inv.role,
           case when v_inv.revoked_at is not null then 'revoked'
                when v_inv.accepted_at is not null then 'accepted'
                when v_inv.expires_at <= now() then 'expired'
                else 'open' end,
           coalesce(v_email = v_inv.email, false)
      from public.companies c where c.id = v_inv.company_id;
end;
$$;
--> statement-breakpoint

create or replace function public.accept_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_inv public.invitations%rowtype;
  v_limit integer;
  v_used integer;
begin
  if v_user is null then raise exception 'hub:not_authenticated' using errcode = '42501'; end if;
  select * into v_inv from public.invitations where token_hash = p_token_hash for update;
  if not found or v_inv.revoked_at is not null then raise exception 'hub:invitation_invalid' using errcode = '22023'; end if;
  if v_inv.accepted_at is not null then raise exception 'hub:invitation_used' using errcode = '22023'; end if;
  if v_inv.expires_at <= now() then raise exception 'hub:invitation_expired' using errcode = '22023'; end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_user;
  if v_email is distinct from v_inv.email then raise exception 'hub:invitation_wrong_email' using errcode = '42501'; end if;

  if exists (select 1 from public.company_members where company_id = v_inv.company_id and user_id = v_user) then
    update public.invitations set accepted_at = now(), accepted_by = v_user where id = v_inv.id;
    return v_inv.company_id;
  end if;

  if v_inv.role <> 'viewer' then
    select c.seats_limit into v_limit from public.companies c where c.id = v_inv.company_id;
    select count(*) into v_used from public.company_members m where m.company_id = v_inv.company_id and m.takes_seat;
    if v_used + 1 > v_limit then raise exception 'hub:seat_limit' using errcode = '54000'; end if;
  end if;

  insert into public.company_members (company_id, user_id, role, invited_by)
  values (v_inv.company_id, v_user, v_inv.role, v_inv.invited_by);
  update public.invitations set accepted_at = now(), accepted_by = v_user where id = v_inv.id;
  update public.profiles set active_company_id = v_inv.company_id where id = v_user;
  return v_inv.company_id;
end;
$$;
--> statement-breakpoint

create or replace function public.revoke_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invitations%rowtype;
  v_role text;
begin
  select * into v_inv from public.invitations where id = p_invitation;
  if not found then raise exception 'hub:not_found' using errcode = 'P0002'; end if;
  v_role := private.my_role(v_inv.company_id);
  if v_role is null or v_role not in ('owner', 'admin') then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  if v_role = 'admin' and v_inv.role = 'admin' then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  update public.invitations set revoked_at = now() where id = p_invitation and accepted_at is null and revoked_at is null;
end;
$$;
--> statement-breakpoint

-- Who may change whom (spec §4.3): Owner changes anyone but themselves and never creates a second Owner
-- (ownership transfer is its own flow); Admin changes only Agents and Viewers, and only into Agent/Viewer.
create or replace function private.assert_can_manage(p_company uuid, p_target uuid, p_new_role public.member_role)
returns public.company_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me text := private.my_role(p_company);
  v_target public.company_members%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'hub:not_authenticated' using errcode = '42501'; end if;
  if v_me is null or v_me not in ('owner', 'admin') then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  select * into v_target from public.company_members where company_id = p_company and user_id = p_target for update;
  if not found then raise exception 'hub:not_found' using errcode = 'P0002'; end if;
  if v_target.role = 'owner' then raise exception 'hub:owner_protected' using errcode = '42501'; end if;
  if p_target = (select auth.uid()) then raise exception 'hub:not_yourself' using errcode = '42501'; end if;
  if p_new_role = 'owner' then raise exception 'hub:forbidden' using errcode = '42501'; end if;
  if v_me = 'admin' and (v_target.role = 'admin' or p_new_role = 'admin') then
    raise exception 'hub:forbidden' using errcode = '42501';
  end if;
  return v_target;
end;
$$;
--> statement-breakpoint

create or replace function public.change_member_role(p_company uuid, p_user uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.company_members;
  v_limit integer;
begin
  v_target := private.assert_can_manage(p_company, p_user, p_role);
  if v_target.role = p_role then return; end if;
  if v_target.role = 'viewer' and p_role <> 'viewer' and v_target.status = 'active' then
    select c.seats_limit into v_limit from public.companies c where c.id = p_company;
    if private.seats_committed(p_company) + 1 > v_limit then raise exception 'hub:seat_limit' using errcode = '54000'; end if;
  end if;
  update public.company_members set role = p_role where company_id = p_company and user_id = p_user;
end;
$$;
--> statement-breakpoint

create or replace function public.set_member_status(p_company uuid, p_user uuid, p_status public.member_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.company_members;
  v_limit integer;
begin
  select * into v_target from public.company_members where company_id = p_company and user_id = p_user;
  if not found then raise exception 'hub:not_found' using errcode = 'P0002'; end if;
  v_target := private.assert_can_manage(p_company, p_user, v_target.role);
  if v_target.status = p_status then return; end if;
  if p_status = 'active' and v_target.role <> 'viewer' then
    select c.seats_limit into v_limit from public.companies c where c.id = p_company;
    if private.seats_committed(p_company) + 1 > v_limit then raise exception 'hub:seat_limit' using errcode = '54000'; end if;
  end if;
  update public.company_members set status = p_status where company_id = p_company and user_id = p_user;
end;
$$;
--> statement-breakpoint

-- Remove a member, or leave a company yourself (an Owner cannot leave; ownership transfer comes first).
create or replace function public.remove_member(p_company uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.company_members%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'hub:not_authenticated' using errcode = '42501'; end if;
  if p_user = (select auth.uid()) then
    select * into v_target from public.company_members where company_id = p_company and user_id = p_user;
    if not found then raise exception 'hub:not_found' using errcode = 'P0002'; end if;
    if v_target.role = 'owner' then raise exception 'hub:owner_protected' using errcode = '42501'; end if;
  else
    select * into v_target from public.company_members where company_id = p_company and user_id = p_user;
    if not found then raise exception 'hub:not_found' using errcode = 'P0002'; end if;
    perform private.assert_can_manage(p_company, p_user, v_target.role);
  end if;
  delete from public.company_members where company_id = p_company and user_id = p_user;
  update public.profiles set active_company_id = null where id = p_user and active_company_id = p_company;
end;
$$;
--> statement-breakpoint

revoke all on function public.create_company(text, text, text) from public, anon;
--> statement-breakpoint
revoke all on function public.create_invitation(uuid, text, public.member_role, text) from public, anon;
--> statement-breakpoint
revoke all on function public.invitation_preview(text) from public, anon;
--> statement-breakpoint
revoke all on function public.accept_invitation(text) from public, anon;
--> statement-breakpoint
revoke all on function public.revoke_invitation(uuid) from public, anon;
--> statement-breakpoint
revoke all on function public.change_member_role(uuid, uuid, public.member_role) from public, anon;
--> statement-breakpoint
revoke all on function public.set_member_status(uuid, uuid, public.member_status) from public, anon;
--> statement-breakpoint
revoke all on function public.remove_member(uuid, uuid) from public, anon;
--> statement-breakpoint
revoke all on function private.seats_committed(uuid) from public, anon;
--> statement-breakpoint
revoke all on function private.assert_can_manage(uuid, uuid, public.member_role) from public, anon;
--> statement-breakpoint
grant execute on function public.create_company(text, text, text) to authenticated;
--> statement-breakpoint
grant execute on function public.create_invitation(uuid, text, public.member_role, text) to authenticated;
--> statement-breakpoint
grant execute on function public.invitation_preview(text) to authenticated;
--> statement-breakpoint
grant execute on function public.accept_invitation(text) to authenticated;
--> statement-breakpoint
grant execute on function public.revoke_invitation(uuid) to authenticated;
--> statement-breakpoint
grant execute on function public.change_member_role(uuid, uuid, public.member_role) to authenticated;
--> statement-breakpoint
grant execute on function public.set_member_status(uuid, uuid, public.member_status) to authenticated;
--> statement-breakpoint
grant execute on function public.remove_member(uuid, uuid) to authenticated;
--> statement-breakpoint
grant execute on function private.seats_committed(uuid) to authenticated, service_role;
