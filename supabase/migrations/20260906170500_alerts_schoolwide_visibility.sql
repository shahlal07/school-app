-- Owner/principal/academic coordinator can monitor all examination alerts.
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select using (
    public.is_owner()
    or public.can_view_school_wide()
    or teacher_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );
