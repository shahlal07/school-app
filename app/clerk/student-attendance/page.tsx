import { requireRole } from "@/lib/auth/session";
import { StudentAttendanceWorkspace } from "@/components/attendance/student-attendance-workspace";
import { getStudentAttendanceWorkspace } from "@/lib/attendance/student-workspace";
import { pakistanDate } from "@/lib/attendance/report";

export default async function ClerkStudentAttendancePage({ searchParams }: { searchParams: Promise<{ class_id?: string; section_id?: string }> }) {
  await requireRole("clerk");
  const params = await searchParams;
  const date = pakistanDate();
  const { options, selected } = await getStudentAttendanceWorkspace(params.class_id, params.section_id);
  return <main className="p-4 sm:p-6"><StudentAttendanceWorkspace options={options} selected={selected} attendanceDate={date} baseHref="/clerk/student-attendance" heading="Student Attendance" description="Clerk can record or correct the daily student register across active classes." /></main>;
}
