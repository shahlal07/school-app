import { requireRole } from "@/lib/auth/session";
import { StaffAttendanceForm } from "@/components/attendance/staff-attendance-form";
import { getStaffAttendance, pakistanDate } from "@/lib/attendance/report";
import { Bdi } from "@/components/shared/bdi";

export default async function ClerkAttendancePage() {
  await requireRole("clerk");
  const date = pakistanDate();
  const { staff, existing } = await getStaffAttendance(date);
  const marked = Object.keys(existing).length;

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Staff administration</p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Staff Attendance</h1>
            <p className="mt-1 text-sm text-neutral-500">Record today&apos;s presence for teachers and staff.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-neutral-400">Date</span>{" "}<Bdi>{date}</Bdi>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">Total staff</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900"><Bdi>{staff.length}</Bdi></p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">Marked today</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900"><Bdi>{marked}</Bdi></p>
        </div>
        <div className="col-span-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:col-span-1">
          <p className="text-xs font-medium text-neutral-500">Remaining</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900"><Bdi>{Math.max(staff.length - marked, 0)}</Bdi></p>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-neutral-900">No active staff found</h2>
          <p className="mt-1 text-sm text-neutral-500">Add active staff records before taking attendance.</p>
        </div>
      ) : (
        <StaffAttendanceForm staff={staff} attendanceDate={date} existing={existing} />
      )}
    </main>
  );
}
