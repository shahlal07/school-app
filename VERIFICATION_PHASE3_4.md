# School OS — Phase 3 + Phase 4 Verification

Date: 2026-09-08
Branch: `phase3-4-clerk-exam-delegation`

## Phase 3 — Clerk Modules

- [x] Added `student_documents` with `pending|received|verified`.
- [x] Added `admissions` with `inquiry|pending|enrolled|rejected`.
- [x] Added `fee_records` with `pending|paid|overdue`.
- [x] RLS uses existing `can_manage_student_records()`; no new student-record helper.
- [x] Removed `anon` table grants from all three new tables; `authenticated` receives table privileges and RLS remains the authorization gate.
- [x] Added Documents, Admissions, and Fees pages/actions using the existing Clerk student-record conventions.
- [x] Added a server-side Clerk dashboard data helper; the concurrent dashboard page itself was intentionally not edited to avoid file collisions.

## Phase 4 — Delegated Exam/Attendance Workflow

- [x] Added `exam_papers.handed_to_clerk_at` and `handed_to_clerk_by`.
- [x] Added `test_results.entered_by_clerk`; `entered_by` remains the actual actor.
- [x] Added `paper_handoff_reminder` and `results_deadline_countdown` alert types.
- [x] Added narrow security-definer RPCs for teacher paper handoff and clerk result entry.
- [x] Clerk result RPC is class-scoped because the existing `schedule_items` schema has no `section_id`; no invented section relationship was added.
- [x] Teacher ownership resolves from existing `schedule_items.teacher_id`, with the existing `teacher_subjects` mapping as the fallback used by current exam scanning data.
- [x] Extended attendance authorization to permit clerk submissions while preserving teacher class/section scoping.
- [x] Added Clerk attendance UI using the existing `ClassAttendanceForm`.
- [x] Added live results countdown and teacher handoff UI.
- [x] Added Clerk marks entry UI clearly identifying the teacher on whose behalf results are entered.
- [x] Kept one hourly cron job (`scan-examination-compliance`); it invokes both the existing examination scanner and the new delegation scanner.
- [x] Delegation scanner uses school timezone (`Asia/Karachi`) for the 48-hour deadline logic.

## Live verification

- [x] Supabase schema checked against the live database before corrections.
- [x] Teacher who does not own the exam was rejected by `mark_paper_handed_to_clerk` in a rolled-back JWT-context transaction.
- [x] Correctly assigned teacher successfully called `mark_paper_handed_to_clerk` in a rolled-back JWT-context transaction.
- [x] Clerk successfully called `clerk_upload_test_results` with a real class roster in a rolled-back JWT-context transaction.
- [x] Teacher was rejected by `clerk_upload_test_results` in a rolled-back JWT-context transaction.
- [x] Confirmed the three new tables have no `anon` table grants.
- [x] Supabase security advisor re-run. Existing baseline contains the project's pre-existing SECURITY DEFINER warnings plus the newly intentional authenticated-callable narrow delegation RPCs; no leaked-password or RLS-table warning was introduced by these tables.

## Deployment status

- Vercel branch deployments are configured from GitHub. The branch's latest deployment was still `BUILDING` at the final check; its error-only build log contained no compile/build errors. Production `main` was not overwritten.

## Collision boundary

This branch intentionally does not modify the concurrent dashboard rebuild files owned by the other session. The Clerk dashboard integration is provided as a data helper for the dashboard owner to wire after their dashboard work is complete.
