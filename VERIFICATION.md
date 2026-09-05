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
- [x] RLS gate (owner path): owner tested the real login themselves in their own browser, landed on `/owner`. Confirmed genuine (not a stale redirect) via `auth.users.last_sign_in_at` populated at `2026-09-05 23:04:09 UTC`. This proves `requireRole('owner')` → `getCurrentProfile()` correctly read the profile row through the `profiles_select` RLS policy (`user_id = auth.uid()` branch) and the role branch worked.
- 📝 Not yet done: owner-invites-teacher flow (needs the service-role key - set in Vercel, not yet pulled for local dev), a teacher test account to exercise the teacher-side path (`/teacher` access, `/owner` redirect-away) and the full "Teacher A cannot see Teacher B" cross-isolation test - the latter is only meaningful once Phase 2's `teacher_subjects` exists, so it's deferred there per the plan.

**Phase 1 gates: Build ✅ / Mobile ✅ / RLS ✅ (owner path live-tested; full teacher-isolation test deferred to Phase 2 where `teacher_subjects` actually exists) / Data N/A this phase.**

Commits: `4ccf3cc` (schema/RLS/registry), `0b6e5a6` (UI system + login + route guards)

## Phase 2 — Examination database (in progress)
Scope note: the owner clarified the school runs PG through 10th, not just 9th/10th. `classes.grade`/`group_name` were already schema-agnostic, so this didn't change the architecture - only what gets seeded.
- [x] Migration `0004_examination_schema`: classes, sections, subjects, teacher_subjects, chapters, topics, students - all with `ON DELETE CASCADE` down the hierarchy and RLS scoping teachers to subjects/chapters/topics/students they're actually assigned to (via `teacher_subjects`), not the whole school's catalog. Renamed the planned `group` column to `group_name` before applying (Postgres reserved keyword - would have forced quoting in every future query).
- [x] Migration `0005_seed_classes_subjects_syllabus`: 1 academic year, 13 classes (PG, Nursery, Prep, 1-10), 13 sections, 80 subjects across all grades, 82 chapters + 82 topics (one topic per chapter) for Physics/Chemistry/Biology/Mathematics in 9th/10th only.
  - Confidence is deliberately uneven and documented in the migration itself: subjects-per-grade and the 4 core Science-group subjects' PTB chapter sequence are confident; every other subject's chapters (English/Urdu/Islamiat/Pakistan Studies/Computer Science, and all of PG-8) are left empty rather than fabricated - same standard applied to Kimi/ChatGPT's drafts is applied to my own content here.
- [x] Security advisor re-run after both migrations: same accepted `is_owner()` residual as Phase 1, plus one new finding - `auth_leaked_password_protection` is disabled. This is an Auth setting (HaveIBeenPwned check), not something `apply_migration` can toggle - **owner action needed**: Supabase Dashboard → Authentication → Policies/Providers → enable leaked-password protection.
- [x] Data gate: inserted a throwaway subject→chapter→topic chain, deleted the subject, confirmed both child rows cascade-deleted (0 orphans) - verified live against the real database, not just read from the schema.
- [x] `types/examination.ts` (ChatGPT draft) corrected to match the actual applied schema: `group` → `group_name`, and `code`/`group_name` marked nullable (both are nullable columns, were typed non-null).
- [x] Build gate: typecheck/lint clean after the type fixes (no UI yet references these types, so `build` wasn't re-run for this step alone).
- 📝 Not yet done: RLS gate for the teacher-isolation path specifically (needs a second teacher account + a `teacher_subjects` row to test against), PG-8 chapter content (deliberately deferred, not silently skipped).
- [x] Syllabus manager CRUD UI (`/owner/syllabus`) and teacher shell/navigation: built by 2 of 3 parallel agents, both reviewed file-by-file against the DB schema and RLS model (not just trusted from their self-reported gate results). Both genuinely solid - correct empty-state handling for the ~76 subjects that currently have zero chapters, confirm-before-delete dialogs, `CLASS_ORDER` correctly overriding alphabetical sort (PG/Nursery/Prep/1-10), reorder via up/down buttons swapping `order_index`, `<form action={signOut}>` using the idiomatic Next.js server-action-as-form-action pattern. One real risk surfaced by the teacher-shell agent's own report: concurrent `next build` runs across agents hit `.next` directory races (`ENOTEMPTY`/`ENOENT`/`PageNotFoundError`) - each self-recovered via retry, but this confirms builds must be serialized, not run in parallel, going forward.
- [x] Owner shell/navigation: third agent finished too. Reviewed - correct mutual exclusivity between the `md:flex` sidebar and `md:hidden` bottom nav (no risk of both rendering), `md:pl-60`/`pb-24 md:pb-6` correctly clear the fixed chrome on both breakpoints, `<form action={signOut}>` used idiomatically. All three agents independently converged on the same `<form action={signOut}>` pattern and the same reasoning about the `.next` concurrent-build race (each self-recovered via retry) - a good sign the conventions I gave them were clear enough to produce consistent results without coordination.
- [x] `app/owner/teachers/**` (my own work, not delegated): owner-invites-teacher flow using `lib/supabase/admin.ts`'s service-role client (`inviteUserByEmail`) + a `profiles` insert, plus activate/deactivate. **Untested** - `SUPABASE_SERVICE_ROLE_KEY` is not yet set in Vercel (confirmed via `vercel env ls`, names only, never the value), so this code compiles and typechecks but has not been exercised live.
- [x] `app/owner/students/**` (my own work): roster CRUD (add/deactivate/remove) + CSV import wired to the already-reviewed `lib/utils/csv.ts`, per-class/section pill and tab selectors reusing the `CLASS_ORDER` constant.
- [x] Build gate (full, sequential - all 3 agents' work + my own, run only after every agent had finished to avoid the `.next` race documented above): `npm run typecheck`, `npm run lint`, `npm run build` all clean. New dynamic routes confirmed: `/owner` (ƒ), `/owner/syllabus` (ƒ), `/owner/students` (ƒ), `/owner/teachers` (ƒ), `/teacher` (ƒ). One real bug caught before commit: I wrote `app/owner/teachers/actions.ts` and `teachers-client.tsx` but forgot `page.tsx` entirely - `tsc`/`lint` don't catch a missing route (nothing imports it, so it's not a type error), only `next build`'s route table made it visible. Added it and re-ran the full gate.
- 🟡 Mobile gate: `/login` re-confirmed live (renders correctly, no auth needed). `/owner/syllabus` and `/owner/students` were **not** visually verified live - both require an authenticated owner session, which I cannot create myself (no password entry, even for testing). Verified instead via code review: no fixed pixel widths, `no-scrollbar` horizontal pill-lists, `shrink-0`/`truncate`/`flex-wrap` used consistently on every row that could otherwise overflow at 375px. A live screenshot from the owner would close this gap fully.

Commit: pending (Phase 2 UI layer - syllabus manager, owner/teacher shells, teachers, students - to be committed together)

Commit: `eedc9dd` (schema + seed + type fixes)

## Phase 3a — Scheduling engine algorithm (in progress)
- [x] Migration `0006_schedule_items`: schedule_items table (test_type/status enums per spec, chapter_id/topic_id `ON DELETE SET NULL` to preserve historical records if syllabus is later restructured, class_id/subject_id `ON DELETE CASCADE`), RLS scoping teacher visibility through `teacher_subjects` (same pattern as subjects/chapters/topics), owner-only writes in this phase.
- [x] Security advisor re-run: same 2 accepted/flagged items as before, no new findings.
- [x] `lib/scheduling/generate-schedule.ts`: pure function, no I/O, no Supabase - takes a subject's chapters+topics and scheduling parameters (start date, eligible days of week, holidays, whether to include chapter tests) and produces the sequential test plan.
- [x] `lib/scheduling/generate-schedule.test.ts`: 6 assertions run directly via `node` (Node 24's native TypeScript support, no test framework needed) - **the exact acceptance sequence from the product spec** (Topic1→Topic2→Topic3→Topic4→Chapter Test→next chapter's Topic1→Topic2→Chapter Test) passes, plus weekend/holiday-skipping, an ineligible start date correctly advancing forward, `includeChapterTest: false`, chapters being sorted by `order_index` regardless of input array order, and empty `testDaysOfWeek` throwing. All 6 pass.
- [x] Build gate: typecheck/lint clean (one real fix needed: `.test.ts` files run directly via `node` need an explicit `.ts` import extension, which conflicts with the app's `moduleResolution: "bundler"` tsconfig setting that forbids it - excluded `**/*.test.ts` from the app's tsconfig scope so both can coexist).
- 📝 Per the plan, this phase is algorithm-only - no calendar/schedule-generation UI yet (that's Phase 3b, stretch-only).

Commit: pending (schedule_items schema + generator algorithm + tests, to be committed together)
