# Verification Log

## Current consolidated state
- GitHub: `main` contains the latest School OS source and security/CI hardening commits.
- Supabase: `school-app` (`khmvmympvnrxiplvggbw`, `ap-southeast-1`) is ACTIVE_HEALTHY.
- Vercel: production URL `https://school-app-kashif11.vercel.app` is live; the latest GitHub changes still need independent deployment verification.

## Latest hardening pass — 2026-09-06
- [x] Added migration `20260906112828_harden_is_owner_function`: `public.is_owner()` now uses an empty `search_path` and fully-qualified objects, preventing search-path object shadowing while retaining `SECURITY DEFINER` because the helper is required by `profiles` RLS without recursion.
- [x] `EXECUTE` on `public.is_owner()` revoked from `public` and `anon`; retained only for `authenticated` because the function is an RLS implementation helper.
- [x] Added production security response headers in `next.config.js`: `X-Content-Type-Options`, `X-Frame-Options`, strict referrer policy, restrictive permissions policy, HSTS, and disabled Next.js powered-by header.
- [x] Added GitHub Actions CI at `.github/workflows/ci.yml` for Node 24 with install, typecheck, lint, and production build gates on pushes/PRs to `main`.
- [x] Added migration `20260906113136_optimize_rls_and_harden_updates`: expensive `auth.uid()` calls are statement-cached via `(select auth.uid())`; authenticated-only catalog policies now target `authenticated` directly; exam-paper/profile updates now include ownership `WITH CHECK` protection.
- [x] Added migration `20260906113155_split_owner_write_rls_policies`: owner `ALL` policies were split into explicit INSERT/UPDATE/DELETE policies so read and write policies no longer overlap unnecessarily.
- [x] Supabase performance advisor re-run after the RLS changes: the previous `multiple_permissive_policies` warnings are cleared. Remaining findings are informational unused-index notices, not correctness/security failures.
- [x] Existing scheduling algorithm tests remain in place and run directly with Node's TypeScript support; the project already has a documented full typecheck/lint/build gate and 23 routes.

## Remaining items that require a human/product decision or live-user action
1. Enable Supabase Auth leaked-password protection in the Supabase Dashboard.
2. Run the second-teacher JWT isolation acceptance test and full teacher-side click-through with two real accounts.
3. Get one green GitHub Actions run on `main` and independently verify the latest commit is deployed on Vercel.
4. Add remaining syllabus chapter content only from authoritative school/Punjab Textbook Board material; do not fabricate curriculum data.
5. Optional: review the informational unused indexes after the application has real traffic; do not remove them blindly before usage patterns are known.

## Parallel-session hardening — verified, one real gap found and fixed
A status report arrived claiming a parallel session had done RLS/security/CI hardening while this session continued other work. Per the "verify before trusting" rule, every claim was checked against the actual repo/Supabase state before being treated as ground truth - a claim being detailed and plausible-sounding is not the same as it being true, and this is exactly why that principle exists.

**Confirmed genuinely true and correctly executed:**
- `20260906113000_harden_is_owner_function`: `search_path = ''` (empty, not just `public`) - stricter than my original `set search_path = public`, closes a real Postgres search-path-hijacking vector by forcing every reference to be fully-qualified. Real improvement.
- `20260906113136_optimize_rls_and_harden_updates`: wraps every `auth.uid()` call in `(select auth.uid())` - the exact documented fix for `auth_rls_initplan`, applied via `ALTER POLICY` in place (no drop/recreate risk). Verified live: the advisor finding is actually gone.
- `20260906113155_split_owner_write_rls_policies`: splits every owner `FOR ALL` policy into separate INSERT/UPDATE/DELETE policies so they stop overlapping the dedicated SELECT policies - the exact fix for `multiple_permissive_policies`. Verified live: also actually gone.
- `next.config.js` security headers (nosniff, frame-deny, HSTS, permissions-policy, no `X-Powered-By`) - present and correct.
- All 15 migrations (this session's + the parallel session's) confirmed actually applied via `list_migrations` against the live database, not just committed as files.

**Found false and fixed**: the report claimed "CI has actually started running... latest run had already passed... Build was queued" - checked via `gh run list` and it was flatly wrong. Every single CI run through that point had **failed** at the build step (`Missing NEXT_PUBLIC_SUPABASE_URL environment variable`) - the workflow was never given the env vars `lib/supabase/client.ts`/`server.ts` need at module load time, since the GitHub Actions runner has no `.env.local` and no repo secrets were configured. This wasn't a report of an in-progress run - it was a report of failure, described as success. Fixed by passing the public anon key/URL directly as build-step env vars (safe to commit - same values already shipped in the browser bundle). Verified: pushed the fix, polled the new run, confirmed `completed success` for real before writing this down.

Lesson applied consistently through this whole project: a plausible, detailed, confidently-worded report is data, not truth, until checked against the actual system.

## Phase A — Role-Based School Administration Expansion — 2026-09-06

Scope: extend School OS from owner+teacher into five roles (owner, principal, academic_coordinator, clerk, teacher) plus a homeroom "class teacher" flag, per the approved plan at the time (`glittery-tinkering-iverson.md`). Explicit permission model: Principal gets school-wide academic READ + student-record read/write, but NOT academic write; Academic Coordinator gets academic write + school-wide academic read, but NOT student-record write; Clerk gets student-record read/write only, NO academic visibility at all; every existing owner/teacher predicate preserved verbatim (additive-only).

### Schema + RLS foundation — ✅ applied and verified live
- [x] Migration `phase_a_role_expansion_schema_rls` applied via Supabase MCP to the live `school-app` project (`khmvmympvnrxiplvggbw`): extends `profiles.role` check constraint to the 5 roles, adds `profiles.designation`/`joining_date`, creates `class_teachers` table + RLS, adds 6 new helper functions (`is_principal`, `is_academic_coordinator`, `is_clerk`, `can_manage_academics`, `can_manage_student_records`, `can_view_school_wide`) and the `set_staff_record_fields` RPC (the sole write path for the two new profile columns - profiles RLS itself stays owner-only, untouched).
- [x] Verified via `pg_proc`: all 8 new/existing functions correctly `SECURITY DEFINER` with `search_path=''`, logic matches spec exactly.
- [x] Verified via `pg_policies`: all ~20 touched policies re-fetched post-migration and diffed against the pre-migration baseline (captured before the migration ran) - every original owner-only and teacher-scoped clause is preserved **verbatim**, only OR'd with the new role checks. No narrowing, no accidental clause loss.
- [x] Security advisor re-run: only the expected new instances of the same already-accepted `authenticated_security_definer_function_executable` warning pattern (`is_owner()` already had this; now the 6 new SECURITY DEFINER helpers do too, by the same deliberate design) plus the pre-existing leaked-password-protection warning. No new category of finding.
- [x] Live regression proof using the two real accounts that exist today (owner + Ahmad the teacher), via `set_config('request.jwt.claims', ...)` JWT impersonation inside a rolled-back transaction (no data touched):
  - Ahmad (role=teacher): `is_owner/is_principal/is_academic_coordinator/is_clerk/can_manage_academics/can_manage_student_records/can_view_school_wide` all correctly `false`; `class_teachers` write correctly denied.
  - Owner: all checks correctly `true`; still sees all 1 student / 82 chapters (matching pre-migration data volume - nothing hidden or duplicated).
- [ ] **Not yet provable**: live proof of principal/academic_coordinator/clerk's actual allowed surface with a REAL account of each role. This requires the owner to create one test account per new role (same "owner sets username+password, hands it over" flow already used for Ahmad) - I cannot do this myself since it requires typing a password into a field, which I don't do even when explicitly asked. Once those exist, the exact per-role SQL assertions from the plan's Verification section can be run the same way as the Ahmad/owner proof above.

### Frontend build — in progress
Five parallel builder sessions were dispatched for the independent remaining build-order items (Principal dashboard + guards, Academic Coordinator dashboard, Clerk dashboard + staff list, class-teacher assignment UI, roll-number search + per-student result cards). Each was instructed to self-verify with `npx tsc --noEmit` and report deviations. Results of each will be reviewed file-by-file before being treated as done - per this project's standing rule, a subagent's "done" is a claim, not a fact, until checked.

Foundational plumbing landed directly (not delegated, since every parallel agent depends on it being consistent):
- `types/database.ts`: `StaffRole` union, `Profile.designation`/`joining_date`.
- `lib/auth/roles.ts` (new): `STAFF_ROLES`, `ROLE_LABELS`, `ROLE_HOME_PATH`, `isStaffRole`.
- `lib/auth/session.ts`: `requireAnyRole(roles[])` added alongside the existing `requireRole`, redirect-on-mismatch now uses `ROLE_HOME_PATH` instead of a binary owner/teacher ternary.
- `app/page.tsx`: login redirect now routes all 5 roles to their own dashboard via `ROLE_HOME_PATH`.
- `app/owner/teachers/{page,actions,teachers-client}.tsx`: staff creation extended to all 5 roles (role `<select>`, `createTeacherAccount` signature, audit action naming), roster now lists all staff not just teachers, "Assign subjects"/subject-count UI hidden for non-teaching roles, `setTeacherActive` guarded to never deactivate an owner account.
- `components/shared/role-shell.tsx` (new): generic role-parameterized shell: `OwnerShell` itself deliberately left untouched (zero regression risk to the already-tested owner route).
- `npx tsc --noEmit` clean after this foundational layer, before any agent started.

### Frontend build — complete, cross-reviewed, and gated green
All five parallel builder sessions completed. Each one's actual diff was read and reviewed line-by-line (not just their self-report) before being treated as done, per this project's standing "verify, don't trust" rule - this caught three real, non-trivial bugs the agents' own self-reports did not flag as unresolved:

1. **Reachability bug**: `StudentRow`'s new per-student result-card link hardcoded `/owner/students/${id}`, but that component is reused by Clerk's (and now Principal's) student roster - clerk has zero academic visibility per the permission model, and principal can't reach `/owner/*` at all (owner-only layout). Fixed by making the link opt-in per embedding page (`resultCardBasePath` prop, omitted = plain text, no link), extracted the ~250-line result-card renderer into a shared `components/examination/student-result-card.tsx` component, and gave Principal its own `/principal/students/[id]` route using it.
2. **Migration/repo drift**: the two Phase A migrations applied directly via the Supabase MCP tool were live in the database but had **no corresponding `.sql` file in `supabase/migrations/`** - a real gap between live schema and version-controlled history that one of the builder agents (correctly) flagged when it found no trace of `academic_coordinator`/`can_manage_academics()` anywhere in the repo's migration files. Fixed by writing both files (and the trigger fix below) to match the live, applied SQL exactly, using the exact version timestamps Supabase's `list_migrations` recorded.
3. **Hidden trigger blocking the plan's explicit intent**: `enforce_exam_paper_review_fields()` (a pre-existing trigger, `0007_exam_papers.sql`) hardcoded `is_owner()` independently of RLS - so even though this phase's RLS granted `academic_coordinator` `can_manage_academics()` write on `exam_papers`, approving/rejecting a paper or advancing its status would have still been silently rejected by this trigger. The plan explicitly says the coordinator can "review papers, same as owner." Fixed via migration `20260906124632_phase_a_extend_paper_review_trigger_to_coordinator`, widened `approvePaper`/`rejectPaper`'s guards in `app/owner/papers/actions.ts` to `requireAnyRole(["owner","academic_coordinator"])`, and flipped `/coordinator/papers` from the initial read-only fallback (a reasonable interim call by the builder agent, given the trigger blocker it found) to full read+write.

**Migrations applied this phase** (all live, all now also committed as local files, all diffed against the pre-migration `pg_policies`/`pg_proc` baseline to confirm zero regression):
- `20260906122252_phase_a_role_expansion_schema_rls`
- `20260906123522_phase_a_profiles_teacher_read_for_student_record_admins`
- `20260906124632_phase_a_extend_paper_review_trigger_to_coordinator`

**Build gates**: `npx tsc --noEmit`, `npm run lint`, and a full `npm run build` all pass clean after every agent's work was merged and the three bugs above were fixed - 44 routes compiled, all five roles' dashboards included.

### Fixed after explicit user confirmation
1. **`app/teacher/layout.tsx` guard widening** - `/owner/results` and `/principal/results` both correctly link to `/teacher/exams/[id]` to view a specific exam's results, but that route sat under `app/teacher/layout.tsx`'s `requireRole("teacher")` guard - so owner and principal got redirected away by their own results page's own link (a genuine pre-existing bug, not introduced by this phase - owner had this same problem before Phase A too). This edit was initially blocked by the auto-mode safety classifier since it touches an auth-guard file; the user was asked explicitly and confirmed. Applied: widened to `requireAnyRole(["teacher","owner","principal","academic_coordinator"])`. Every write action reachable from that page has its own independent guard/RLS check unaffected by this change - this only fixes who can view the page, not who can act on it. Re-verified `tsc`/`lint` clean after applying.

### Live RLS proof with real accounts — done, one more real bug found and fixed
The owner created three real test accounts through the production UI itself (`test.principal`/principal, `test.coordinator`/academic_coordinator, `test.clerk`/clerk) - the exact same flow already used for Ahmad/usman, owner setting username+password directly, no password ever seen or typed by the assistant. Every per-role SQL assertion from the plan's Verification section was then run live via JWT-context impersonation (`set_config('request.jwt.claims', ...)` inside a rolled-back transaction - nothing persisted, confirmed afterward with zero leaked test rows):

- **Principal**: `is_owner=false`, `can_manage_academics=false`, `can_view_school_wide=true`, `can_manage_student_records=true`. A real INSERT into `chapters` was rejected with an actual `new row violates row-level security policy` error (not just a boolean check). A real INSERT into `class_teachers` succeeded (assignment authority correctly includes principal).
- **Academic Coordinator**: `is_owner=false`, `can_manage_academics=true`, `can_view_school_wide=true`, `can_manage_student_records=false`. A real INSERT into `chapters` succeeded (confirmed via row count inside the transaction, not just absence-of-error). A real INSERT into `students` was rejected with a genuine RLS violation.
- **Clerk**: `can_manage_academics=false`, `can_view_school_wide=false`, `can_manage_student_records=true`. Confirmed zero visibility into `chapters`/`schedule_items`/`test_results`/`alerts` (the genuinely restricted curriculum/assessment tables - `subjects` catalog visibility is intentionally part of bucket 2 per the approved plan, not a gap). A real INSERT into `students` succeeded; a real INSERT into `class_teachers` was rejected (assignment authority correctly excludes clerk). Staff-list read (`profiles` where `role='teacher'`) returned exactly the 2 real teacher accounts, with the owner's own profile row correctly hidden.
- **Teacher (Ahmad)**: every new-role boolean check `false`; `class_teachers` write correctly denied - zero regression to the existing teacher-scoped model.
- **Owner**: every check `true`, full visibility unchanged.

**One real, serious bug found by this live testing** (not caught by static review): `subjects_select` was never extended to `can_view_school_wide()`, so an academic_coordinator - despite correctly having `can_manage_academics()` write on chapters/topics/schedule_items/exam_papers - could not `SELECT` the `subjects` table those rows reference at all (confirmed: 0 of 80 subjects visible). This would have silently broken every subject-name lookup across the entire Coordinator UI (schedule, papers, performance, reports all reference `subjects`). Fixed via migration `20260906133037_phase_a_fix_coordinator_subjects_visibility` (additive, existing owner/`can_manage_student_records()`/teacher-scoped clauses preserved verbatim) and re-verified live: coordinator now sees all 80 subjects, and the chapter-insert proof above was re-run successfully after the fix.

Security advisor re-run after this fix: identical 9 findings (8 expected `SECURITY DEFINER`-executable warnings for the intentional helper functions + the pre-existing leaked-password-protection warning) - no new findings introduced.

### Still open
1. Manual click-through verification of the new dashboards as the actual test-role accounts (vs. owner previewing them) has not been done - only the owner's own click-through (account creation, staff list) plus the SQL-level RLS proof above.
