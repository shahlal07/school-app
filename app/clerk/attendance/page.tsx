import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ClassAttendanceForm } from "@/components/attendance/class-attendance-form";
import type { AttendanceStatus } from "@/types/attendance";

function pakistanDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function ClerkAttendancePage({ searchParams }: { searchParams?: { classId?: string; sectionId?: string } }) {
  await requireRole("clerk");
  const supabase=createClient(); const today=pakistanDate();
  const [{data:classes},{data:sections}] = await Promise.all([supabase.from("classes").select("id,name").order("name"),supabase.from("sections").select("id,name,class_id").order("name")]);
  const classId=searchParams?.classId ?? classes?.[0]?.id; const sectionId=searchParams?.sectionId ?? sections?.find(s=>s.class_id===classId)?.id;
  if(!classId||!sectionId) return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold">Attendance</h1><p className="mt-2 text-sm text-neutral-500">No classes or sections are configured.</p></main>;
  const [{data:students},{data:session}] = await Promise.all([supabase.from("students").select("id,roll_no,name").eq("class_id",classId).eq("section_id",sectionId).eq("is_active",true).order("roll_no"),supabase.from("attendance_sessions").select("id,status").eq("attendance_date",today).eq("class_id",classId).eq("section_id",sectionId).maybeSingle()]);
  const {data:records}=session?.id?await supabase.from("attendance_records").select("student_id,status").eq("session_id",session.id):{data:[] as {student_id:string;status:AttendanceStatus}[]};
  const existing:Record<string,AttendanceStatus>={}; for(const r of records??[]) existing[r.student_id]=r.status;
  const selectedClass=classes?.find(c=>c.id===classId); const selectedSection=sections?.find(s=>s.id===sectionId);
  return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">Submit Attendance</h1><p className="mt-1 text-sm text-neutral-500">Clerk submission · {today}</p><form className="mt-5 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2"><label className="text-sm font-medium">Class<select name="classId" defaultValue={classId} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" onChange={undefined}>{(classes??[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-sm font-medium">Section<select name="sectionId" defaultValue={sectionId} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2">{(sections??[]).filter(s=>s.class_id===classId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="sm:col-span-2"><Link href={`/clerk/attendance?classId=${classId}&sectionId=${sectionId}`} className="text-xs text-primary-600">Load selected class</Link></div></form><div className="mt-5"><p className="mb-3 text-sm text-neutral-600">{selectedClass?.name ?? "Class"} · {selectedSection?.name ?? "Section"} · {students?.length ?? 0} active students</p><ClassAttendanceForm students={students??[]} classId={classId} sectionId={sectionId} attendanceDate={today} existing={existing} submitted={session?.status==="submitted"&&Object.keys(existing).length===(students?.length??0)}/></div></main>;
}
