import type { AttendanceStatus } from "@/types/attendance";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export interface StaffAttendanceSummaryRow {
  user_id: string;
  full_name: string;
  designation: string | null;
  role: string;
  status: AttendanceStatus | null;
}

export async function StaffAttendanceSummary({ rows, date }: { rows: StaffAttendanceSummaryRow[]; date: string }) {
  const t = await getT();
  const present = rows.filter((row) => row.status === "present" || row.status === "late" || row.status === "excused").length;
  const absent = rows.filter((row) => row.status === "absent" || row.status === "leave").length;
  const missing = rows.filter((row) => !row.status).length;

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("attendanceLeadership.staffSummary.eyebrow")}</p><h2 className="mt-1 text-lg font-semibold text-neutral-900">{t("attendanceLeadership.staffSummary.rollTitlePrefix")} · <Bdi>{date}</Bdi></h2></div><div className="flex gap-2 text-xs font-medium"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{t("attendanceLeadership.staffSummary.present")} <Bdi>{present}</Bdi></span><span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{t("attendanceLeadership.staffSummary.absent")} <Bdi>{absent}</Bdi></span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{t("attendanceLeadership.staffSummary.missing")} <Bdi>{missing}</Bdi></span></div></div>
      </div>
      <div className="divide-y divide-neutral-100">
        {rows.slice(0, 12).map((row) => <div key={row.user_id} className="flex items-center gap-3 px-4 py-3 sm:px-5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-neutral-900"><Bdi>{row.full_name}</Bdi></p><p className="truncate text-xs text-neutral-500"><Bdi>{row.designation ?? row.role}</Bdi></p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "present" ? "bg-emerald-50 text-emerald-700" : row.status === "late" ? "bg-amber-50 text-amber-700" : row.status === "absent" || row.status === "leave" ? "bg-red-50 text-red-700" : row.status === "excused" ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-500"}`}>{row.status ? t(`attendanceLeadership.staffSummary.statusLabel.${row.status}`) : t("attendanceLeadership.staffSummary.notMarked")}</span></div>)}
        {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-neutral-500">{t("attendanceLeadership.staffSummary.noActiveStaff")}</div>}
      </div>
    </section>
  );
}
