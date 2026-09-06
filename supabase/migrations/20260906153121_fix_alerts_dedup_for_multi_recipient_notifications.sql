-- ATTEMPTED FIX, REVERTED two migrations later (see
-- 20260906153224_revert_alerts_dedup_index_widening.sql) - kept here for an
-- accurate history rather than silently dropped.
--
-- Found via live end-to-end testing: mark_exam_paper_printed() inserts two
-- open alerts for the same (type='paper_printed', reference_id=job_id) - one
-- for the teacher, one for the coordinator - which always violates
-- uq_alerts_open_dedup (type, reference_id) WHERE status='open' whenever a
-- coordinator exists and differs from the teacher (the normal case).
--
-- This widening broke scan_examination_compliance() instead: it has 9
-- separate "on conflict (type, reference_id) where status='open' do nothing"
-- clauses that require an EXACT column-list match against the target index
-- for ON CONFLICT inference, so every one of those inserts would now error.
-- It would also have let the scanner's own NULL-recipient alerts duplicate
-- on every run, since NULL never collides with NULL in a unique index - the
-- opposite of the scanner's intended dedup behavior.
drop index if exists public.uq_alerts_open_dedup;
create unique index uq_alerts_open_dedup on public.alerts (type, reference_id, recipient_id) where status = 'open';
