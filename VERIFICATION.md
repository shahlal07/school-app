# Verification Log

## Phase 0 — Bootstrap
- [x] Next.js 14 + TypeScript + Tailwind scaffold created (app/, lib/supabase/*, components/, types/)
- [x] PWA foundation: manifest.json, sw.js, real generated PNG icons (192/512), service worker registration wired via `components/shared/service-worker-register.tsx` and Next.js `metadata`/`viewport` APIs in `app/layout.tsx`
- [x] Build gate: `npm run typecheck` — 0 errors (2 real type errors found in incoming draft code and fixed: unnarrowed `process.env` values used inside closures in `lib/supabase/client.ts`/`server.ts`, and an implicitly-`any` `setAll` cookie handler)
- [x] Build gate: `npm run lint` — 0 warnings/errors
- [x] Build gate: `npm run build` — succeeds, static export of `/` and `/_not-found`
- [x] Mobile gate: 375×812 viewport, `scrollWidth === clientWidth` (375 === 375), no horizontal scroll, screenshot captured
- N/A RLS gate (no database yet)
- N/A Data/cascade gate (no database yet)
- 🟡 Icons are a placeholder teal "S" mark (real PNGs, not the AI-claimed-but-nonexistent ones from the first draft) — replace with real school branding later, already externalized to `public/icons/`
- [x] Supabase project created: `school-app` (ref `khmvmympvnrxiplvggbw`, ap-southeast-1, free tier)
- [x] GitHub repo created: https://github.com/shahlal07/school-app (private)
- [x] Vercel project created and linked: kashif11/school-app, auto-deploys from `main`
- [x] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY set on Vercel (production/preview/development)
- 🟡 SUPABASE_SERVICE_ROLE_KEY: pending — owner setting this directly via `vercel env add` so the secret never passes through chat
- [x] Production deployment READY: https://school-app-kashif11.vercel.app

Commit: `a3595b9`

## Phase 1 — School core (in progress)
- [x] Migration `0001_school_core`: profiles, departments, department_assignments, academic_years, school_settings, audit_logs — applied to project `khmvmympvnrxiplvggbw`
- [x] RLS enabled on all six tables; owner-bypass via `is_owner()` (SECURITY DEFINER, avoids recursion on profiles); `BEFORE UPDATE` trigger blocks any non-owner from changing role/is_active/user_id on a profile — the concrete defense for the "teacher escalates to owner" acceptance test
- [x] Security advisor run after migration found 2 real issues (both SECURITY DEFINER functions publicly callable via PostgREST RPC by default) — fixed via migration `0002_lock_down_security_definer_functions`. One residual advisor warning accepted and documented: `is_owner()` must stay callable by `authenticated` for RLS to evaluate at all; it only reports the caller's own role, so this is safe.
- [x] Migration `0003_seed_department_registry`: `examination` active, `attendance`/`fees` inactive placeholders proving the registry pattern
- [x] `types/database.ts` (ChatGPT draft, reviewed): 2 real type mismatches fixed against the actual applied schema (`audit_logs.actor_id` and `entity_id` are nullable columns but were typed non-null)
- 🟡 RLS gate not yet fully exercised: no real auth users exist yet (needs the owner bootstrap — see below), so the "Teacher A JWT query on Teacher B row → 0 rows, Owner JWT → 1 row" test is written into the migration's intent but not yet run against live sessions
- 📝 Not yet done: owner-invites-teacher server action, `/owner` and `/teacher` route groups with server-side role enforcement, login wiring (login UI drafted by ChatGPT but held out of the repo/build until Kimi's `components/ui/button.tsx` and `input.tsx` exist — writing it now would break the Build Gate on a missing-module error)

Commits: `<pending — batched with route-group work>`
