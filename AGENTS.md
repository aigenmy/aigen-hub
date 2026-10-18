# AIGen Hub — boot file for Codex, Antigravity, Gemini, Grok and other agents

Same authority as `CLAUDE.md`; read that file — everything in it applies to every tool. Short version:

1. Read `D:\AI MASTER\BRAIN\BRAIN.md`, then `D:\EVS MASTER\_PLANS\11-AIGEN.MY-SAAS-SPEC.md`, then `STANDARDS.md` here.
2. Monorepo (pnpm workspaces): `apps/web` (Next.js 16), `packages/{db,modules,ui,i18n,legal}`, `tests/e2e`, `scripts`.
3. Local run without accounts: `pnpm db:local:start && pnpm seed:demo && pnpm dev:local`.
4. Before saying done: `pnpm typecheck && pnpm test && pnpm i18n:check && pnpm test:e2e`, screenshots from `.local/screenshots/`, changelog entry with evidence.
5. Never: secrets in files, edit a live server, skip RLS on a company table, hard-code UI text, remove a working feature.
