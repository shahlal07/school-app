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
