# AIGen Hub — Claude Code boot file

The SaaS app at **app.aigen.my** (plan 11). Not WordPress. Not uploaded through `UPDATE\` — it deploys from GitHub to Vercel.

Read first, in order: `D:\AI MASTER\BRAIN\BRAIN.md` → `D:\EVS MASTER\_PLANS\11-AIGEN.MY-SAAS-SPEC.md` (the spec; §11 phases, §12 decisions D1–D18 = defaults) → `STANDARDS.md` (here) → `AGENTS.md` (layout).

## Where things are

| What | Where |
|---|---|
| Next.js app | `apps/web` (App Router, `proxy.ts`, server actions in `app/actions`) |
| Database schema, migrations, RLS, RPCs | `packages/db` (`src/schema.ts` → `drizzle-kit generate`; hand-written SQL in `migrations/0000`, `0002`, `0003`) |
| Tenant-isolation tests | `packages/db/tests/rls.test.ts` (real Postgres 17, Supabase shim) |
| Module registry (menu, phases) | `packages/modules` |
| Design tokens + components | `packages/ui` (`tokens.css` is the only place colours live) |
| Languages en / ms / zh | `packages/i18n/messages/<locale>/<namespace>.json` |
| Legal texts | `packages/legal/docs/*.md` + `operator.json` → `pnpm --filter @hub/legal build` |
| E2E | `tests/e2e` (Playwright, Edge on Windows) |

## Run it on this PC (no accounts needed)

```
pnpm install
pnpm db:local:start      # real Postgres 17 in .local/ (no Docker), shim + migrations
pnpm seed:demo           # demo company Kedai Kopi Mesra + test accounts (one-click sign-in)
pnpm dev:local           # http://localhost:3000 in LOCAL test mode
```

Checks: `pnpm typecheck`, `pnpm test` (unit + RLS), `pnpm i18n:check`, `pnpm test:e2e` (fresh `hub_e2e` database each run; screenshots land in `.local/screenshots/`).

## Two sign-in modes

- `AUTH_MODE=supabase` (default, production): Supabase Auth (Google, email + password, email link, TOTP 2-step) via `@supabase/ssr`.
- `AUTH_MODE=local`: test accounts in the local `auth.users` stand-in, real TOTP codes, HMAC session cookie. `lib/env.ts` refuses it on Vercel or with a non-local database.

Both give the same claims (`sub`, `email`, `aal`); every query runs in `withClaims()` → `set local role authenticated` → RLS.

## Rules that bite

- **Secrets**: never in the repo, in a file or under `D:\`. Production values live in Vercel env. The Supabase dev project's values are Windows user environment variables `AIGEN_HUB_DEV_SUPABASE_URL`, `AIGEN_HUB_DEV_SUPABASE_KEY`, `AIGEN_HUB_DEV_DATABASE_URL` (read by `pnpm dev:supabase` and `pnpm remote:migrate` / `remote:staff`, from the registry if the process started earlier). Never print them.
- **New table** = `company_id NOT NULL` + index + RLS policies + explicit grants in a migration (Supabase grants everything to `anon` by default; migration 0002 revokes) + audit trigger + appears in the RLS matrix test automatically (it scans every `company_id` table).
- Privileged writes go through RPCs or guard triggers in SQL, never "trust the browser". Error codes are `hub:<code>` → `errors.<code>` in i18n.
- `'use server'` files export only async functions; constants live in `lib/constants.ts`. Pure class helpers live in `packages/ui/src/styles.ts` (server-safe).
- next-intl's Next plugin is NOT used (its `@swc/core` add-on fails on this PC); `next.config.ts` sets the `next-intl/config` alias itself.
- No browser `alert/confirm` (lint rule); use `ConfirmDialog`.
- Every new string in en, ms and zh (`pnpm i18n:check` fails otherwise).

## End of session

Update `D:\AI MASTER\BRAIN\STATUS.md` + `HANDOFF.md` and add an entry to `D:\EVS MASTER\_DOCS\06-CHANGELOG.md` with what was verified.
