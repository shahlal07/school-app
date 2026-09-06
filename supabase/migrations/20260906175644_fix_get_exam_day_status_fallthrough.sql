-- get_exam_day_status() returned two rows for weekend dates: the weekend
-- branch's `return query` doesn't exit the function (only a plain `return`
-- does), so execution fell through into the final `return query select true,
-- 'School day'` unconditionally. Add an explicit early return.
create or replace function public.get_exam_day_status(p_date date)
returns table(is_eligible boolean, reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_override public.calendar_overrides%rowtype;
  v_weekend_days text;
  v_dow int;
begin
  select * into v_override from public.calendar_overrides where date = p_date;
  if found then
    if v_override.day_status = 'working_day' then
      return query select true, format('Working day override: %s', v_override.name);
    else
      return query select false, format('%s (%s)', v_override.name, v_override.holiday_type);
    end if;
    return;
  end if;
  select value into v_weekend_days from public.school_settings where key = 'weekend_days';
  v_dow := extract(dow from p_date)::int;
  if (','||coalesce(v_weekend_days,'0,6')||',' like '%,'||v_dow||',%') then
    return query select false, 'Weekend'::text;
    return;
  end if;
  return query select true, 'School day'::text;
end;
$$;
