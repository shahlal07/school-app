import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ClerkResultsRoster } from "@/components/examination/clerk-results-roster";

export default async function ClerkMarksPage({ searchParams }: { searchParams?: { id?: string } }) {
  await requireRole("clerk");
  const supabase = createClient();
  const selectedId = searchParams?.id;
  const { data: schedules } = await supabase.from("schedule_items").select("id,title,class_id,subject_id,teacher_id,scheduled_date,status").order("scheduled_date", { ascending: false });
  const past = (schedules ?? []).filter(s => s.scheduled_date <= new Date().toISOString().slice(0,10) && !["cancelled","skipped"].includes(s.status));
  if (!selectedId) {
    const teacherIds=Array.from(new Set(past.map(s=>s.teacher_id)));
    const [{data:classes},{data:subjects},{data:teachers}] = await Promise.all([
      supabase.from("classes").select("id,name"),supabase.from("subjects").select("id,name"),supabase.from("profiles").select("user_id,full_name").in("user_id",teacherIds)
    ]);
    const classNames=new Map((classes??[]).map(x=>[x.id,x.name])); const subjectNames=new Map((subjects??[]).map(x=>[x.id,x.name])); const teacherNames=new Map((teachers??[]).map(x=>[x.user_id,x.full_name]));
    return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">Enter Marks</h1><p className="mt-1 text-sm text-neutral-500">Select a completed exam to enter results on behalf of its teacher.</p><div className="mt-5 flex flex-col gap-2">{past.map(s=><Link key={s.id} href={`/clerk/marks?id=${s.id}`} className="rounded-xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50"><p className="font-medium text-neutral-900">{s.title}</p><p className="mt-1 text-xs text-neutral-500">{classNames.get(s.class_id) ?? "Class"} · {subjectNames.get(s.subject_id) ?? "Subject"} · {teacherNames.get(s.teacher_id) ?? "Teacher"} · {s.scheduled_date}</p></Link>)}</div></main>;
  }
  const schedule=(schedules??[]).find(s=>s.id===selectedId); if(!schedule) return <main className="p-4 sm:p-6"><p className="text-sm text-red-600">Exam not found.</p></main>;
  const [{data:teacher},{data:students},{data:results}]=await Promise.all([
    supabase.from("profiles").select("user_id,full_name").eq("user_id",schedule.teacher_id).maybeSingle(),
    supabase.from("students").select("id,roll_no,name").eq("class_id",schedule.class_id).eq("is_active",true).order("roll_no"),
    supabase.from("test_results").select("student_id,marks_obtained,total_marks,is_absent").eq("schedule_item_id",selectedId)
  ]);
  return <main className="p-4 sm:p-6"><Link href="/clerk/marks" className="text-sm font-medium text-primary-600">&larr; All exams</Link><h1 className="mt-3 text-xl font-semibold text-neutral-900">{schedule.title}</h1><p className="mt-1 text-sm text-neutral-500">Scheduled {schedule.scheduled_date}</p><div className="mt-5"><ClerkResultsRoster scheduleItemId={schedule.id} students={students??[]} existingResults={results??[]} teacherName={teacher?.full_name??"the assigned teacher"}/></div></main>;
}
