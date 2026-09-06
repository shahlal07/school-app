import type { DailyAttendanceReportRow } from "@/types/attendance";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export interface MissingAttendanceRow { className: string; sectionName: string; teacherName: string; }

export async function DailyAttendanceReport({ rows, missing, date }: { rows: DailyAttendanceReportRow[]; missing: MissingAttendanceRow[]; date: string }) {
  const t = await getT();
  const total = rows.reduce((n, row) => n + row.total_students, 0);
  const present = rows.reduce((n, row) => n + row.present_count, 0);
  const absent = rows.reduce((n, row) => n + row.absent_count, 0);
  const late = rows.reduce((n, row) => n + row.late_count, 0);
  const percentage = total ? Math.round((present / total) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("attendanceLeadership.dailyReport.statSchoolAttendance"), `${percentage}%`],
          [t("attendanceLeadership.dailyReport.statStudents"), String(total)],
          [t("attendanceLeadership.dailyReport.statAbsent"), String(absent)],
          [t("attendanceLeadership.dailyReport.statLate"), String(late)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-2xl font-semibold text-neutral-900 tabular-nums"><Bdi>{value}</Bdi></p></div>
        ))}
      </section>

      {missing.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t("attendanceLeadership.dailyReport.notSubmittedEyebrow")}</p><p className="mt-1 text-sm text-amber-900">{t("attendanceLeadership.dailyReport.notSubmittedDescription")} <Bdi>{date}</Bdi>.</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-800">{missing.length}</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{missing.map((item) => <div key={`${item.className}-${item.sectionName}`} className="rounded-xl border border-amber-200 bg-white px-3 py-2"><p className="text-sm font-semibold text-neutral-900"><Bdi>{item.className}</Bdi> · <Bdi>{item.sectionName}</Bdi></p><p className="text-xs text-neutral-500">{t("attendanceLeadership.dailyReport.assignedTeacher")} <Bdi>{item.teacherName}</Bdi></p></div>)}</div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("attendanceLeadership.dailyReport.classAttendanceTitlePrefix")} · <Bdi>{date}</Bdi></h2><p className="mt-1 text-xs text-neutral-500">{t("attendanceLeadership.dailyReport.liveReportDescription")}</p></div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400"><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colClass")}</th><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colStudents")}</th><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colPresent")}</th><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colAbsent")}</th><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colLate")}</th><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colRate")}</th><th className="px-4 py-3">{t("attendanceLeadership.dailyReport.colStatus")}</th></tr></thead><tbody className="divide-y divide-neutral-100">{rows.map((row) => <tr key={row.session_id}><td className="px-4 py-3 font-medium text-neutral-900"><Bdi>{row.class_name}</Bdi> · <Bdi>{row.section_name}</Bdi></td><td className="px-4 py-3 tabular-nums text-neutral-600">{row.total_students}</td><td className="px-4 py-3 tabular-nums text-emerald-700">{row.present_count}</td><td className="px-4 py-3 tabular-nums text-red-700">{row.absent_count}</td><td className="px-4 py-3 tabular-nums text-amber-700">{row.late_count}</td><td className="px-4 py-3 font-semibold tabular-nums text-neutral-900">{row.attendance_percentage}%</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.session_status === "submitted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.session_status === "submitted" ? t("attendanceLeadership.dailyReport.statusSubmitted") : t("attendanceLeadership.dailyReport.statusActionNeeded")}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">{t("attendanceLeadership.dailyReport.noAttendanceSubmitted")}</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
