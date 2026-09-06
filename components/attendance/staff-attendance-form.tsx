"use client";

import { useMemo, useState, useTransition } from "react";
import { saveStaffAttendance } from "@/lib/attendance/actions";
import type { AttendanceStatus } from "@/types/attendance";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Bdi } from "@/components/shared/bdi";

interface StaffMember { user_id: string; full_name: string; designation: string | null; role: string; }

const STATUS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "P" },
  { value: "absent", label: "A" },
  { value: "late", label: "L" },
  { value: "leave", label: "Lv" },
  { value: "excused", label: "E" }
];

export function StaffAttendanceForm({ staff, attendanceDate, existing }: { staff: StaffMember[]; attendanceDate: string; existing: Record<string, AttendanceStatus> }) {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const next: Record<string, AttendanceStatus> = {};
    staff.forEach((member) => { next[member.user_id] = existing[member.user_id] ?? "present"; });
    return next;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const counts = useMemo(() => Object.values(statuses).reduce((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {} as Record<string, number>), [statuses]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveStaffAttendance({ attendance_date: attendanceDate, records: staff.map((member) => ({ staff_id: member.user_id, status: statuses[member.user_id] })) });
      if (!result.ok) { setError(t("attendanceLeadership.staffForm.saveError")); return; }
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("attendanceLeadership.staffForm.eyebrow")}</p><p className="mt-1 text-sm text-neutral-600">{t("attendanceLeadership.staffForm.subtitle")}</p></div>
        <div className="flex gap-2 text-xs font-medium"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{t("attendanceLeadership.staffForm.present")} <Bdi>{counts.present ?? 0}</Bdi></span><span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{t("attendanceLeadership.staffForm.absent")} <Bdi>{counts.absent ?? 0}</Bdi></span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{t("attendanceLeadership.staffForm.late")} <Bdi>{counts.late ?? 0}</Bdi></span></div>
      </div>
      <div className="divide-y divide-neutral-100">
        {staff.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-neutral-900">{member.full_name}</p><p className="truncate text-xs text-neutral-500">{member.designation ?? member.role}</p></div>
            <div className="flex gap-1">{STATUS.map((item) => <button key={item.value} type="button" disabled={saved || isPending} onClick={() => setStatuses((prev) => ({ ...prev, [member.user_id]: item.value }))} className={`h-8 min-w-8 rounded-lg border px-1.5 text-xs font-bold ${statuses[member.user_id] === item.value ? "border-neutral-800 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-400"}`} aria-label={`${member.full_name}: ${item.value}`}>{item.label}</button>)}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={submit} disabled={saved || isPending || staff.length === 0} className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saved ? t("attendanceLeadership.staffForm.saved") : isPending ? t("attendanceLeadership.staffForm.saving") : `${t("attendanceLeadership.staffForm.saveButton")} · ${staff.length}`}</button>
      </div>
    </div>
  );
}
