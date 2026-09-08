"use client";

import { useMemo, useState, useTransition } from "react";
import { saveStaffAttendance } from "@/lib/attendance/actions";
import type { AttendanceStatus } from "@/types/attendance";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Bdi } from "@/components/shared/bdi";

interface StaffMember { user_id: string; full_name: string; designation: string | null; role: string; }

const STATUS: { value: AttendanceStatus; label: string; full: string }[] = [
  { value: "present", label: "P", full: "Present" },
  { value: "absent", label: "A", full: "Absent" },
  { value: "late", label: "L", full: "Late" },
  { value: "leave", label: "Lv", full: "Leave" },
  { value: "excused", label: "E", full: "Excused" }
];

export function StaffAttendanceForm({ staff, attendanceDate, existing }: { staff: StaffMember[]; attendanceDate: string; existing: Record<string, AttendanceStatus> }) {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>(() => {
    const next: Record<string, AttendanceStatus | null> = {};
    staff.forEach((member) => { next[member.user_id] = existing[member.user_id] ?? null; });
    return next;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const counts = useMemo(() => Object.values(statuses).reduce((a, s) => { if (s) a[s] = (a[s] ?? 0) + 1; return a; }, {} as Record<string, number>), [statuses]);
  const remaining = staff.filter((member) => !statuses[member.user_id]).length;

  function submit() {
    if (remaining > 0) { setError(`Mark attendance for all ${remaining} remaining staff members.`); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveStaffAttendance({ attendance_date: attendanceDate, records: staff.map((member) => ({ staff_id: member.user_id, status: statuses[member.user_id] as AttendanceStatus })) });
      if (!result.ok) { setError(t("attendanceLeadership.staffForm.saveError")); return; }
      setSaved(true);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Staff attendance register</p><p className="mt-1 text-sm text-neutral-600">Tap one status for every staff member, then save the register.</p></div>
          <div className="flex flex-wrap gap-1.5 text-xs font-medium">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Present <Bdi>{counts.present ?? 0}</Bdi></span>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Absent <Bdi>{counts.absent ?? 0}</Bdi></span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Late <Bdi>{counts.late ?? 0}</Bdi></span>
          </div>
        </div>
      </div>

      <div className="hidden border-b border-neutral-100 bg-neutral-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 sm:grid sm:grid-cols-[1fr_auto] sm:items-center">
        <span>Staff member</span><span>Status</span>
      </div>
      <div className="divide-y divide-neutral-100">
        {staff.map((member) => {
          const selected = statuses[member.user_id];
          return (
            <div key={member.user_id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900">{member.full_name}</p><p className="truncate text-xs text-neutral-500">{member.designation ?? member.role}</p></div>
              <div className="flex shrink-0 gap-1.5" role="group" aria-label={`${member.full_name} attendance`}>
                {STATUS.map((item) => (
                  <button key={item.value} type="button" disabled={saved || isPending} onClick={() => setStatuses((prev) => ({ ...prev, [member.user_id]: item.value }))} title={item.full} aria-label={`${member.full_name}: ${item.full}`} aria-pressed={selected === item.value} className={`h-9 min-w-9 rounded-lg border px-1.5 text-xs font-bold transition-colors ${selected === item.value ? "border-neutral-800 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-400 hover:border-neutral-400 hover:text-neutral-700"}`}>{item.label}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50/70 px-4 py-4 sm:px-5">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">{remaining ? <><Bdi>{remaining}</Bdi> staff still need a status.</> : "Every active staff member has a status."}</p>
          <button type="button" onClick={submit} disabled={saved || isPending || staff.length === 0 || remaining > 0} className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{saved ? t("attendanceLeadership.staffForm.saved") : isPending ? t("attendanceLeadership.staffForm.saving") : "Save staff attendance"}</button>
        </div>
      </div>
    </div>
  );
}
