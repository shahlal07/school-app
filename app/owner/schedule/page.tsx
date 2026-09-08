import type { Class, Subject } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { OwnerExaminationOverview } from "@/components/examination/owner-examination-overview";

function pakistanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function SchedulePage() {
  const supabase = createClient();
  const [classesRes, subjectsRes, scheduleRes] = await Promise.all([
    supabase.from("classes").select("id,name"),
    supabase.from("subjects").select("id,name"),
    supabase.from("schedule_items").select("*").order("scheduled_date", { ascending: true })
  ]);

  const classNames = Object.fromEntries((((classesRes.data as Pick<Class, "id" | "name">[] | null) ?? []).map((item) => [item.id, item.name])));
  const subjectNames = Object.fromEntries((((subjectsRes.data as Pick<Subject, "id" | "name">[] | null) ?? []).map((item) => [item.id, item.name])));
  const items = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];

  return <OwnerExaminationOverview items={items} classNames={classNames} subjectNames={subjectNames} today={pakistanDate()} />;
}
