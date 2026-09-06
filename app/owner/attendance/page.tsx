import { requireRole } from "@/lib/auth/session";
import { DailyAttendanceReport } from "@/components/attendance/daily-attendance-report";
import { getDailyAttendanceReport, pakistanDate } from "@/lib/attendance/report";

export default async function OwnerAttendancePage() {
  await requireRole("owner");
  const date = pakistanDate();
  const report = await getDailyAttendanceReport(date);
  return <main className="p-4 sm:p-6"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Attendance department</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900">Attendance overview</h1><p className="mt-1 text-sm text-neutral-500">{date} · executive awareness only. Routine attendance entry stays with teachers and the coordinator.</p></div><DailyAttendanceReport rows={report.rows} missing={report.missing} date={date} /></main>;
}
