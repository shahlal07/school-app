-- `revoke ... from public` in the prior migration didn't fully strip the
-- implicit anon grant Supabase's PostgREST role picks up on function create;
-- every other RPC in this project is authenticated-only, so match that here.
revoke all on function public.is_eligible_exam_day(date) from anon;
revoke all on function public.get_exam_day_status(date) from anon;
revoke all on function public.next_eligible_exam_day(date) from anon;
