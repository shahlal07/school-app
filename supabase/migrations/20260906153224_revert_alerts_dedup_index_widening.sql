-- REVERT: widening this index to (type, reference_id, recipient_id) broke
-- scan_examination_compliance(), which has 9 separate
-- "on conflict (type, reference_id) where status='open' do nothing" clauses
-- targeting the exact original index by column list - Postgres requires an
-- exact match for ON CONFLICT inference, so every one of those inserts
-- would now error at runtime. Also, NULL columns never collide with each
-- other in a unique index, so widening would have let the scanner's own
-- NULL-recipient alerts duplicate on every run instead of deduping - the
-- opposite of what was intended. Reverting to the original definition;
-- see fix_mark_exam_paper_printed_dedup_collision for the real fix,
-- applied at the function level instead of the index.
drop index if exists public.uq_alerts_open_dedup;
create unique index uq_alerts_open_dedup on public.alerts (type, reference_id) where status = 'open';
