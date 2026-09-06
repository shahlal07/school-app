-- The clerk print-queue page (app/clerk/papers/page.tsx) resolves each exam
-- paper's class/subject by joining through schedule_items, but the clerk role
-- was never added to schedule_items' SELECT policy (only exam_papers was,
-- when the print workflow was built) - so the join silently returned nothing
-- and every row showed "Unknown class / Unknown subject". Clerk already sees
-- the exam_papers rows themselves via is_clerk(), so seeing which class/
-- subject each paper belongs to isn't a new capability, just what's needed
-- to actually print the right thing.
alter policy schedule_items_select on public.schedule_items
  using (is_owner() or can_view_school_wide() or is_clerk() or (exists (
    select 1 from teacher_subjects ts
    where ts.subject_id = schedule_items.subject_id
      and ts.teacher_id = (select auth.uid())
  )));
