import { requireRole } from "@/lib/auth/session";
import { DailyAttendanceReport } from "@/components/attendance/daily-attendance-report";
import { StaffAttendanceSummary, type StaffAttendanceSummaryRow } from "@/components/attendance/staff-attendance-summary";
import { AcademicOperationsBridge } from "@/components/attendance/academic-operations-bridge";
import { getDailyAttendanceReport, getStaffAttendance, pakistanDate } from "@/lib/attendance/report";
import { getAttendanceAcademicSignals, getAttendanceTrend, getExamAttendanceExceptions } from "@/lib/attendance/integration";

export default async function OwnerAttendancePage() {
  await requireRole("owner");
  const date = pakistanDate();
  const [report, staff, signals, exceptions, trend] = await Promise.all([
    getDailyAttendanceReport(date),
    getStaffAttendance(date),
    getAttendanceAcademicSignals(),
    getExamAttendanceExceptions(),
    getAttendanceTrend(14)
  ]);
  const staffRows = (staff.staff ?? []).map((member) => ({
    ...member,
    status: staff.existing[member.user_id] ?? null
  })) as StaffAttendanceSummaryRow[];

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Attendance department</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900">Attendance overview</h1><p className="mt-1 text-sm text-neutral-500">{date} · executive awareness only. Routine attendance entry stays with teachers and the coordinator.</p></div>
      <DailyAttendanceReport rows={report.rows} missing={report.missing} date={date} />
      <AcademicOperationsBridge signals={signals.rows} examExceptions={exceptions.rows} trend={trend.rows} attendanceHref="/owner/attendance" />
      <StaffAttendanceSummary rows={staffRows} date={date} />
    </main>
  );
}
