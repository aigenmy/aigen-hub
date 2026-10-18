-- LOCAL / TEST ONLY. Stands in for the parts of Supabase the migrations rely on: the API roles,
-- auth.users, auth.uid(), auth.jwt() and Supabase's default grants on schema public.
-- Never run this against a Supabase project (it already has all of this).

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end
$$;

grant anon, authenticated, service_role to current_user;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique,
  phone text,
  encrypted_password text,
  email_confirmed_at timestamp,
  phone_confirmed_at timestamp,
  last_sign_in_at timestamp,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
$$;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$$;

grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Supabase grants everything in public to the API roles by default; RLS is what protects data.
-- Migration 0002 revokes this explicitly, so local behaves like production.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Local sign-in support (dev mode only): a per-database random key that signs local session cookies.
create schema if not exists local_dev;
revoke all on schema local_dev from public;
create table if not exists local_dev.settings (key text primary key, value text not null);
create table if not exists local_dev.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  friendly_name text not null default '',
  secret text not null,
  status text not null default 'unverified',
  created_at timestamptz not null default now()
);
insert into local_dev.settings (key, value)
values ('session_key', encode(sha256((gen_random_uuid()::text || clock_timestamp()::text || random()::text)::bytea), 'hex'))
on conflict (key) do nothing;
