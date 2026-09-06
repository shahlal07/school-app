-- The exam_papers review-field trigger (0007_exam_papers.sql) hardcoded
-- is_owner() independently of RLS, so even after this phase's RLS policies
-- granted academic_coordinator can_manage_academics() write access to
-- exam_papers, the trigger still silently blocked them from approving/
-- rejecting a paper or advancing its status past submission - contradicting
-- the plan's explicit "coordinator can review papers, same as owner" intent.
-- Extend the trigger's authority check to match the can_manage_academics()
-- bucket exactly (owner + academic_coordinator) - principal/clerk/teacher
-- remain unable to touch review fields, same as before.
create or replace function public.enforce_exam_paper_review_fields()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if not public.can_manage_academics() then
    if new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by
      or new.review_notes is distinct from old.review_notes then
      raise exception 'Only an owner or academic coordinator can set paper review fields.';
    end if;
    if new.status is distinct from old.status
      and new.status not in ('not_started', 'draft', 'submitted') then
      raise exception 'Only an owner or academic coordinator can advance a paper past submission.';
    end if;
  end if;
  return new;
end;
$$;
