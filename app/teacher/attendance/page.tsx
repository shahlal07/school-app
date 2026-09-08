import { requireAnyRole } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/get-translator";
import { StudentAttendanceWorkspace } from "@/components/attendance/student-attendance-workspace";
import { getTeacherAttendanceWorkspace } from "@/lib/attendance/teacher-workspace";
import { pakistanDate } from "@/lib/attendance/report";
import { Bdi } from "@/components/shared/bdi";

export default async function TeacherAttendancePage({ searchParams }: { searchParams: Promise<{ class_id?: string; section_id?: string }> }) {
  const t = await getT();
  const profile = await requireAnyRole(["teacher", "owner", "principal", "academic_coordinator"]);
  const params = await searchParams;
  const today = pakistanDate();
  const { options, selected } = await getTeacherAttendanceWorkspace(profile.user_id, params.class_id, params.section_id);
  if (!options.length || !selected) return <main className="p-4 sm:p-6"><div className="rounded-2xl border border-neutral-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("nav.attendance")}</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900">No assigned class</h1><p className="mt-2 text-sm text-neutral-500">No class/section is currently assigned to this teacher.</p></div></main>;
  return <main className="p-4 sm:p-6"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{t("teacher.attendance.eyebrow")}</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900">Student Attendance</h1><p className="mt-1 text-sm text-neutral-500"><Bdi>{today}</Bdi> · Take attendance only for your assigned class/sections.</p></div><StudentAttendanceWorkspace options={options} selected={selected} attendanceDate={today} baseHref="/teacher/attendance" heading={`${selected.className} · ${selected.sectionName}`} description="Class teacher register · roll-number based daily attendance" /></main>;
}
