-- Security-definer helpers used by every RLS policy (spec §9.4).
-- Schema `private` is not exposed through the Supabase API. plpgsql so the bodies may name tables
-- that migration 0001 creates. Every function pins search_path = '' and qualifies all names.

create schema if not exists private;
--> statement-breakpoint
revoke all on schema private from public;
--> statement-breakpoint
grant usage on schema private to anon, authenticated, service_role;
--> statement-breakpoint

-- Companies the signed-in user is an active member of (deleted companies excluded).
create or replace function private.my_company_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select m.company_id
      from public.company_members m
      join public.companies c on c.id = m.company_id
     where m.user_id = (select auth.uid())
       and m.status = 'active'
       and c.deleted_at is null;
end;
$$;
--> statement-breakpoint

-- The signed-in user's role in one company ('owner' | 'admin' | 'agent' | 'viewer'), or null.
create or replace function private.my_role(p_company uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select m.role::text
            from public.company_members m
            join public.companies c on c.id = m.company_id
           where m.company_id = p_company
             and m.user_id = (select auth.uid())
             and m.status = 'active'
             and c.deleted_at is null);
end;
$$;
--> statement-breakpoint

-- AIGen staff: the profile flag AND a second factor in this session (aal2). Staff without MFA get nothing extra.
create or replace function private.is_staff()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return coalesce((select p.is_staff from public.profiles p where p.id = (select auth.uid())), false)
     and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
end;
$$;
--> statement-breakpoint

-- True when the signed-in user and p_user are active members of at least one common company.
create or replace function private.shares_company(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
      from public.company_members a
      join public.company_members b on b.company_id = a.company_id
     where a.user_id = (select auth.uid())
       and a.status = 'active'
       and b.user_id = p_user);
end;
$$;
--> statement-breakpoint

revoke all on function private.my_company_ids() from public;
--> statement-breakpoint
revoke all on function private.my_role(uuid) from public;
--> statement-breakpoint
revoke all on function private.is_staff() from public;
--> statement-breakpoint
revoke all on function private.shares_company(uuid) from public;
--> statement-breakpoint
grant execute on function private.my_company_ids() to anon, authenticated, service_role;
--> statement-breakpoint
grant execute on function private.my_role(uuid) to anon, authenticated, service_role;
--> statement-breakpoint
grant execute on function private.is_staff() to anon, authenticated, service_role;
--> statement-breakpoint
grant execute on function private.shares_company(uuid) to anon, authenticated, service_role;
