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
