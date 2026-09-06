create or replace function public.enforce_result_submission_workflow()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if not (public.is_owner() or public.is_academic_coordinator()) and new.status not in ('draft','submitted') then
      raise exception 'Teachers can only create draft or submitted result workflows.';
    end if;
    if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
    return new;
  end if;
  if old.status = 'finalized' and new.status <> 'finalized' and not (public.is_owner() or public.is_academic_coordinator()) then raise exception 'Finalized results cannot be changed by this user.'; end if;
  if not (public.is_owner() or public.is_academic_coordinator()) then
    if new.status in ('reviewed','finalized') then raise exception 'Only the academic coordinator or owner can review or finalize results.'; end if;
    if old.status in ('submitted','reviewed','finalized') and new.status <> old.status then raise exception 'Submitted results are locked until reviewed.'; end if;
    if new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at or new.review_notes is distinct from old.review_notes then raise exception 'Only the academic coordinator or owner can set review fields.'; end if;
  end if;
  if new.status='submitted' and old.status<>'submitted' and new.submitted_at is null then new.submitted_at:=now(); end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_result_submission_workflow on public.result_submissions;
create trigger trg_enforce_result_submission_workflow before insert or update on public.result_submissions for each row execute function public.enforce_result_submission_workflow();

create or replace function public.prevent_test_result_edits_after_submission()
returns trigger language plpgsql security definer set search_path = public
as $$
declare schedule_id uuid;
begin
  schedule_id:=coalesce(new.schedule_item_id,old.schedule_item_id);
  if exists(select 1 from public.result_submissions rs where rs.schedule_item_id=schedule_id and rs.status in ('submitted','reviewed','finalized')) and not(public.is_owner() or public.is_academic_coordinator()) then raise exception 'Result marks are locked after submission for review.'; end if;
  return coalesce(new,old);
end; $$;
drop trigger if exists trg_prevent_test_result_edits_after_submission on public.test_results;
create trigger trg_prevent_test_result_edits_after_submission before insert or update or delete on public.test_results for each row execute function public.prevent_test_result_edits_after_submission();
revoke execute on function public.prevent_test_result_edits_after_submission() from public,anon,authenticated;
