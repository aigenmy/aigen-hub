# AIGen Hub — standards and release checklist (spec §13)

## Every change

- Typecheck, lint, unit tests, RLS tests and the i18n check pass: `pnpm check`.
- E2E passes on desktop (1440×900) and phone (390×844): `pnpm test:e2e`. No console errors (the test fixture fails on any).
- A 10-minute walk through the changed screens in a real browser, screenshots attached to the changelog entry.
- "What was not verified" is written down.

## Data and security

- Every company table: `company_id NOT NULL`, index leading on `company_id`, RLS on, policies via `private.*` helpers, explicit grants (revoke from `anon`), audit trigger. The RLS matrix test covers new tables automatically; add role-specific cases when a table has role rules.
- Privileged columns are protected by guard triggers; privileged actions are RPCs that check the caller.
- No secret in the repo, in logs or in the browser. Company secrets go to Supabase Vault (Phase 1+).
- `audit_log` and `legal_acceptances` are append-only.
- Staff need the profile flag **and** 2-step sign-in in the session (`aal2`); the database checks it, not only the UI.

## UI

- Tokens only (`packages/ui/src/tokens.css`); no page invents colours.
- Every icon-only control has a tooltip (`IconButton` requires a label).
- Every destructive action uses `ConfirmDialog` with the object's name. Never `alert/confirm`.
- Every string in en, ms and zh. Money as `RM 1,234.50` (`formatRM`).
- Fits 1366×768 without horizontal scroll; phone layout at 390 px for Home, Team, Settings.
- Red `WarningBox` (with a required tick where the spec marks ✔) for the texts in spec §8.8.

## Never

Hollow screens (buttons that do nothing), WordPress look, provider/model names shown to companies, removing a working feature, editing a live server, writing to `D:\EVS MASTER\BACKUP\`.
