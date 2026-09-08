import { requireRole } from "@/lib/auth/session";
import { OwnerAttendanceOverview } from "@/components/attendance/owner-attendance-overview";
import { type StaffAttendanceSummaryRow } from "@/components/attendance/staff-attendance-summary";
import { getDailyAttendanceReport, getStaffAttendance, pakistanDate } from "@/lib/attendance/report";
import { getAttendanceAcademicSignals, getAttendanceTrend, getExamAttendanceExceptions } from "@/lib/attendance/integration";
import { getTeacherAttendanceCompliance } from "@/lib/attendance/teacher-compliance";

export default async function OwnerAttendancePage() {
  await requireRole("owner");
  const date = pakistanDate();
  const [report, staff, signals, exceptions, trend, teacherCompliance] = await Promise.all([
    getDailyAttendanceReport(date),
    getStaffAttendance(date),
    getAttendanceAcademicSignals(),
    getExamAttendanceExceptions(),
    getAttendanceTrend(14),
    getTeacherAttendanceCompliance(14)
  ]);

  const staffRows = (staff.staff ?? []).map((member) => ({
    ...member,
    status: staff.existing[member.user_id] ?? null,
  })) as StaffAttendanceSummaryRow[];

  return (
    <OwnerAttendanceOverview
      rows={report.rows}
      missing={report.missing}
      staff={staffRows}
      signals={signals.rows}
      exceptions={exceptions.rows}
      trend={trend.rows}
      teacherCompliance={teacherCompliance}
      date={date}
    />
  );
}
