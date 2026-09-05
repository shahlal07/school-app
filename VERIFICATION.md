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
- [x] `components/ui/*` and `components/shared/bottom-nav.tsx` / `install-pwa-banner.tsx`: Kimi's draft reviewed. Two real problems found and fixed before integration:
  - Kimi's claim that `button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`, and tailwind/globals updates were "already created via tools earlier" was **false** — none of those files existed on disk (same false-completion pattern as the earlier PNG claim). Written from scratch to match the spec given to Kimi.
  - `bottom-nav.tsx` matched icons to labels via fuzzy substring matching (`label.toLowerCase().includes(iconKey)`), which only actually matched "Home" — every other tab (Exams/Alerts/Messages/Profile) would silently render the home icon. Fixed to an explicit `icon` prop.
  - Design tokens (`primary`/`success`/`warning`/`danger` color scales, `shadow-dialog`, `shadow-toast`, `.no-scrollbar`, `.safe-bottom`) referenced by multiple components didn't exist in `tailwind.config.ts`/`globals.css` — added them (primary aliased to the existing teal brand color).
- [x] `types/examination.ts`, `lib/utils/csv.ts` (ChatGPT draft, Phase 2 prep): reviewed, matches spec exactly including row-error precedence and same-class+section duplicate scoping; one robustness fix (header comparison now trims whitespace).
- [x] Real login flow implemented in-house: `lib/auth-actions.ts` (`signIn`/`signOut` server actions using Supabase Auth, looks up the profile role and redirects to `/owner` or `/teacher`), `lib/auth/session.ts` (`requireRole` guard), `/owner` and `/teacher` route groups with layout-level server-side guards
- [x] Build gate: typecheck/lint/build all green after every addition (2 real issues caught and fixed along the way: an unescaped `'` failing `react/no-unescaped-entities`, and a stale `.next` cache from running `build` and `dev` concurrently)
- [x] Mobile gate: `/login` at 375×812, no horizontal scroll, screenshot confirms primary-teal button and card render correctly (confirms the new design tokens actually work, not just compile)
- [x] Owner bootstrap: real Supabase auth user created by the owner (their own dashboard, their own password - never entered by me); matching `profiles` row inserted via SQL with `role = 'owner'` (`user_id 2cb6d295-6229-4f75-b226-f4bb079bceeb`)
- 🟡 RLS gate: schema/policies are in place and reviewed, but the live "sign in as owner, land on /owner" exercise is pending the owner testing login themselves in their own browser (I do not enter account passwords, even test ones, even when given them - verifying via `auth.users.last_sign_in_at` instead of the credential itself)
- 📝 Not yet done: owner-invites-teacher flow (needs the service-role key, which is set in Vercel but not yet pulled for local dev), a second teacher account to actually exercise "Teacher A cannot see Teacher B's data"

Commits: `4ccf3cc` (schema/RLS/registry), plus this batch (UI system + login + route guards, pending commit below)
