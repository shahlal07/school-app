import { createClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/get-translator";
import { ClassAttendanceForm } from "@/components/attendance/class-attendance-form";
import { Bdi } from "@/components/shared/bdi";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";

function pakistanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function TeacherAttendancePage() {
  const t = await getT();
  const profile = await requireAnyRole(["teacher", "owner", "principal", "academic_coordinator"]);
  const supabase = createClient();
  const today = pakistanDate();

  const { data: assignments } = await supabase.from("class_teachers").select("class_id,section_id").eq("teacher_id", profile.user_id);
  if (!assignments?.length) {
    return <main className="p-4 sm:p-6"><div className="rounded-2xl border border-neutral-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("nav.attendance")}</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900">{t("teacher.attendance.noClassTitle")}</h1><p className="mt-2 text-sm text-neutral-500">{t("teacher.attendance.noClassDescription")}</p></div></main>;
  }

  const assignment = assignments[0];
  const [{ data: classRow }, { data: sectionRow }, { data: students }, { data: session }] = await Promise.all([
    supabase.from("classes").select("id,name,grade,group_name").eq("id", assignment.class_id).maybeSingle(),
    supabase.from("sections").select("id,name").eq("id", assignment.section_id).maybeSingle(),
    supabase.from("students").select("id,roll_no,name").eq("class_id", assignment.class_id).eq("section_id", assignment.section_id).eq("is_active", true).order("roll_no"),
    supabase.from("attendance_sessions").select("id,status").eq("attendance_date", today).eq("class_id", assignment.class_id).eq("section_id", assignment.section_id).maybeSingle()
  ]);

  const { data: existingRecords } = session?.id
    ? await supabase.from("attendance_records").select("student_id,status").eq("session_id", session.id)
    : { data: [] as { student_id: string; status: AttendanceStatus }[] };
  const existing: Record<string, AttendanceStatus> = {};
  (existingRecords as Pick<AttendanceRecord, "student_id" | "status">[] | null ?? []).forEach((row) => { existing[row.student_id] = row.status; });
  const studentRows = (students ?? []) as { id: string; roll_no: string; name: string }[];

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{t("teacher.attendance.eyebrow")}</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900"><Bdi>{classRow?.name ?? t("teacher.home.classFallback")}</Bdi> · <Bdi>{sectionRow?.name ?? t("teacher.attendance.sectionFallback")}</Bdi></h1><p className="mt-1 text-sm text-neutral-500"><Bdi>{today}</Bdi> · {t("teacher.attendance.firstPeriodLabel")} · <Bdi>{studentRows.length}</Bdi> {t("teacher.attendance.activeStudentsSuffix")}</p></div>
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">{t("teacher.attendance.rollNumberNote")}</div>
      </div>
      <ClassAttendanceForm students={studentRows} classId={assignment.class_id} sectionId={assignment.section_id} attendanceDate={today} existing={existing} submitted={session?.status === "submitted" && Object.keys(existing).length === studentRows.length} />
    </main>
  );
}
