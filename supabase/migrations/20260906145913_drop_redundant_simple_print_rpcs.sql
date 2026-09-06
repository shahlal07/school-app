-- A parallel session built a considerably more complete print-job workflow
-- (exam_paper_print_jobs table, queue_exam_paper_for_print(),
-- mark_exam_paper_printed(), create_exam_paper_reprint_job() - approval-
-- gated, version-tracked, duplicate-prevented) concurrently with these two
-- simpler functions from 20260906140205_print_workflow_schema_rls.sql. No
-- application code ever referenced these two (the UI for this feature had
-- not been built in this session yet), so they are dropped outright rather
-- than left as dead, confusing duplicates alongside the real system.
drop function if exists public.queue_paper_for_printing(uuid);
drop function if exists public.mark_paper_printed(uuid);
