import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentProfileClient, type StudentProfileFormData } from "./student-profile-client";

export default async function ClerkStudentProfilePage({ params }: { params: { id: string } }) {
  await requireAnyRole(["owner", "principal", "clerk"]);
  const supabase = createClient();
  const { data: student } = await supabase.from("students").select("id,name,roll_no,class_id,section_id").eq("id", params.id).maybeSingle();
  if (!student) notFound();

  const [{ data: profile }, { data: classes }, { data: sections }, { data: results }] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("student_id", params.id).maybeSingle(),
    supabase.from("classes").select("id,name").order("name"),
    supabase.from("sections").select("id,class_id,name").order("name"),
    supabase.from("test_results").select("schedule_item_id,marks_obtained,total_marks,is_pass,is_absent,remarks,entered_at").eq("student_id", params.id).order("entered_at", { ascending: false })
  ]);

  const scheduleIds = (results ?? []).map((r) => r.schedule_item_id);
  const { data: schedules } = scheduleIds.length
    ? await supabase.from("schedule_items").select("id,subject_id,title,scheduled_date,test_type").in("id", scheduleIds)
    : { data: [] as { id: string; subject_id: string; title: string; scheduled_date: string; test_type: string }[] };
  const subjectIds = (schedules ?? []).map((s) => s.subject_id);
  const { data: subjects } = subjectIds.length ? await supabase.from("subjects").select("id,name,code").in("id", subjectIds) : { data: [] as { id: string; name: string; code: string | null }[] };
  const scheduleMap = new Map((schedules ?? []).map((s) => [s.id, s]));
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s]));

  const formProfile: StudentProfileFormData = {
    fatherName: profile?.father_name ?? "", guardianName: profile?.guardian_name ?? "", guardianRelation: profile?.guardian_relation ?? "",
    dateOfBirth: profile?.date_of_birth ?? "", gender: profile?.gender ?? "", nationality: profile?.nationality ?? "",
    address: profile?.address ?? "", city: profile?.city ?? "", contactNumber: profile?.contact_number ?? "",
    guardianContactNumber: profile?.guardian_contact_number ?? "", admissionDate: profile?.admission_date ?? "",
    previousSchool: profile?.previous_school ?? "", bloodGroup: profile?.blood_group ?? "", notes: profile?.notes ?? ""
  };

  return <main className="p-4 sm:p-6">
    <div className="mb-5"><Link href="/clerk/students" className="text-sm text-primary-600 hover:underline">← Students</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold text-neutral-900">{student.name}</h1><p className="mt-1 text-sm text-neutral-500">Roll No. <span className="font-medium text-neutral-800">{student.roll_no}</span></p></div><Badge variant="success">Academic record</Badge></div>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
      <StudentProfileClient student={student} profile={formProfile} classes={classes ?? []} sections={sections ?? []} />
      <Card className="h-fit"><CardHeader><CardTitle>Result tracking</CardTitle><p className="text-sm font-normal text-neutral-500">Every result is tied to this student's permanent ID and displayed with the assigned roll number.</p></CardHeader><CardContent>
        {(results ?? []).length === 0 ? <p className="text-sm text-neutral-500">No results recorded yet.</p> : <div className="space-y-2">{(results ?? []).map((result, i) => { const schedule = scheduleMap.get(result.schedule_item_id); const subject = schedule ? subjectMap.get(schedule.subject_id) : undefined; const pct = result.is_absent || result.marks_obtained == null ? null : Number(result.marks_obtained) / Number(result.total_marks) * 100; return <div key={`${result.schedule_item_id}-${i}`} className="rounded-xl border border-neutral-200 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900">{subject?.name ?? schedule?.title ?? "Assessment"}</p><p className="text-xs text-neutral-500">{schedule?.scheduled_date ?? "—"} · {schedule?.test_type ?? "Test"}</p></div><div className="text-right text-sm font-semibold">{result.is_absent ? "Absent" : `${result.marks_obtained ?? "—"}/${result.total_marks}`}</div></div>{pct !== null && <p className="mt-1 text-xs text-neutral-500">{pct.toFixed(0)}%{result.is_pass === true ? " · Pass" : result.is_pass === false ? " · Needs attention" : ""}</p>}{result.remarks && <p className="mt-1 text-xs text-neutral-500">{result.remarks}</p>}</div>; })}</div>}
      </CardContent></Card>
    </div>
  </main>;
}
