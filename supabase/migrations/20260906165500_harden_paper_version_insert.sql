-- Teachers may append draft/submitted versions only while the parent paper is still in their editing stage.
drop policy if exists exam_paper_versions_insert on public.exam_paper_versions;

create policy exam_paper_versions_insert on public.exam_paper_versions
  for insert with check (
    public.is_owner()
    or public.can_manage_academics()
    or (
      created_by = (select auth.uid())
      and status in ('draft','submitted')
      and exists (
        select 1
        from public.exam_papers ep
        where ep.id = exam_paper_versions.exam_paper_id
          and ep.teacher_id = (select auth.uid())
          and ep.status in ('not_started','draft')
      )
    )
  );
