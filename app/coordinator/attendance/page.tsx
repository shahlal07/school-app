import { requireAnyRole } from "@/lib/auth/session";
import { DailyAttendanceReport } from "@/components/attendance/daily-attendance-report";
import { StaffAttendanceForm } from "@/components/attendance/staff-attendance-form";
import { getDailyAttendanceReport, getStaffAttendance, pakistanDate } from "@/lib/attendance/report";

export default async function CoordinatorAttendancePage() {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const date = pakistanDate();
  const report = await getDailyAttendanceReport(date);
  const staff = profile.role === "academic_coordinator" ? await getStaffAttendance(date) : null;

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Attendance department</p><h1 className="mt-1 text-2xl font-semibold text-neutral-900">Daily attendance command center</h1><p className="mt-1 text-sm text-neutral-500">{date} · student roll is recorded by class teacher in first period. Staff roll is maintained by the coordinator.</p></div>
      <DailyAttendanceReport rows={report.rows} missing={report.missing} date={date} />
      {staff && <div className="mt-6"><StaffAttendanceForm staff={staff.staff} attendanceDate={date} existing={staff.existing} /></div>}
    </main>
  );
}
