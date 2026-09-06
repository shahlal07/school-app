import type { DailyAttendanceReportRow } from "@/types/attendance";

export interface MissingAttendanceRow { className: string; sectionName: string; teacherName: string; }

export function DailyAttendanceReport({ rows, missing, date }: { rows: DailyAttendanceReportRow[]; missing: MissingAttendanceRow[]; date: string }) {
  const total = rows.reduce((n, row) => n + row.total_students, 0);
  const present = rows.reduce((n, row) => n + row.present_count, 0);
  const absent = rows.reduce((n, row) => n + row.absent_count, 0);
  const late = rows.reduce((n, row) => n + row.late_count, 0);
  const percentage = total ? Math.round((present / total) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["School attendance", `${percentage}%`],
          ["Students", String(total)],
          ["Absent", String(absent)],
          ["Late", String(late)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-2xl font-semibold text-neutral-900 tabular-nums">{value}</p></div>
        ))}
      </section>

      {missing.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Attendance not submitted</p><p className="mt-1 text-sm text-amber-900">These class teachers have not completed first-period attendance for {date}.</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-800">{missing.length}</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{missing.map((item) => <div key={`${item.className}-${item.sectionName}`} className="rounded-xl border border-amber-200 bg-white px-3 py-2"><p className="text-sm font-semibold text-neutral-900">{item.className} · {item.sectionName}</p><p className="text-xs text-neutral-500">Assigned teacher: {item.teacherName}</p></div>)}</div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Class attendance · {date}</h2><p className="mt-1 text-xs text-neutral-500">Live school-wide report. Submitted attendance is available immediately to authorized leadership.</p></div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="px-4 py-3">Class</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Present</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">Late</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-neutral-100">{rows.map((row) => <tr key={row.session_id}><td className="px-4 py-3 font-medium text-neutral-900">{row.class_name} · {row.section_name}</td><td className="px-4 py-3 tabular-nums text-neutral-600">{row.total_students}</td><td className="px-4 py-3 tabular-nums text-emerald-700">{row.present_count}</td><td className="px-4 py-3 tabular-nums text-red-700">{row.absent_count}</td><td className="px-4 py-3 tabular-nums text-amber-700">{row.late_count}</td><td className="px-4 py-3 font-semibold tabular-nums text-neutral-900">{row.attendance_percentage}%</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.session_status === "submitted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.session_status === "submitted" ? "Submitted" : "Action needed"}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">No attendance has been submitted for this date.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
