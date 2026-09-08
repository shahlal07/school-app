"use client";

import { useMemo, useState, useTransition } from "react";
import { submitClassAttendance } from "@/lib/attendance/actions";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Bdi } from "@/components/shared/bdi";
import type { AttendanceStatus } from "@/types/attendance";

interface Student { id: string; roll_no: string; name: string; }
interface Props { students: Student[]; classId: string; sectionId: string; attendanceDate: string; existing?: Record<string, AttendanceStatus>; submitted?: boolean; }
const STATUS: { value: AttendanceStatus; label: string; full: string }[] = [
  { value: "present", label: "P", full: "Present" }, { value: "absent", label: "A", full: "Absent" }, { value: "late", label: "L", full: "Late" }, { value: "leave", label: "Lv", full: "Leave" }, { value: "excused", label: "E", full: "Excused" }
];
const statusClass: Record<AttendanceStatus, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-700", absent: "border-red-200 bg-red-50 text-red-700", late: "border-amber-200 bg-amber-50 text-amber-700", leave: "border-sky-200 bg-sky-50 text-sky-700", excused: "border-violet-200 bg-violet-50 text-violet-700"
};

export function ClassAttendanceForm({ students, classId, sectionId, attendanceDate, existing, submitted }: Props) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(submitted));
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>(() => Object.fromEntries(students.map((student) => [student.id, existing?.[student.id] ?? null])));
  const counts = useMemo(() => Object.values(statuses).reduce((acc, value) => { if (value) acc[value] = (acc[value] ?? 0) + 1; return acc; }, {} as Record<string, number>), [statuses]);
  const remaining = students.filter((student) => !statuses[student.id]).length;

  function markAllPresent() {
    setError(null);
    setStatuses(Object.fromEntries(students.map((student) => [student.id, "present" as AttendanceStatus])));
  }
  function submit() {
    if (remaining > 0) { setError(`Mark attendance for all ${remaining} remaining students before saving.`); return; }
    setError(null);
    startTransition(async () => {
      const result = await submitClassAttendance({ class_id: classId, section_id: sectionId, attendance_date: attendanceDate, records: students.map((student) => ({ student_id: student.id, status: statuses[student.id] as AttendanceStatus })) });
      if (!result.ok) { setError(result.error || t("teacher.attendance.classForm.errorSaving")); return; }
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Student attendance register</p><p className="mt-1 text-sm text-neutral-600">Mark every student explicitly. Use “Mark all present” only after confirming the roll.</p></div>
          <button type="button" disabled={saved || isPending || students.length === 0} onClick={markAllPresent} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Mark all present</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Present <Bdi>{counts.present ?? 0}</Bdi></span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Absent <Bdi>{counts.absent ?? 0}</Bdi></span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Late <Bdi>{counts.late ?? 0}</Bdi></span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">Unmarked <Bdi>{remaining}</Bdi></span>
        </div>
      </div>
      <div className="hidden border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 sm:grid sm:grid-cols-[3rem_1fr_auto] sm:gap-3"><span>Roll</span><span>Student</span><span>Status</span></div>
      <div className="divide-y divide-neutral-100">
        {students.map((student) => {
          const current = statuses[student.id];
          return <div key={student.id} className="flex items-center gap-2 px-3 py-3 sm:grid sm:grid-cols-[3rem_1fr_auto] sm:gap-3 sm:px-4">
            <span className="w-9 text-center text-sm font-semibold tabular-nums text-neutral-500"><Bdi>{student.roll_no}</Bdi></span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900"><Bdi>{student.name}</Bdi></span>
            <div className="flex shrink-0 gap-1">
              {STATUS.map((item) => <button key={item.value} type="button" disabled={saved || isPending} onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: item.value }))} title={item.full} aria-label={`${student.name}: ${item.full}`} aria-pressed={current === item.value} className={`h-8 min-w-8 rounded-lg border px-1.5 text-xs font-bold transition ${current === item.value ? statusClass[item.value] : "border-neutral-200 bg-white text-neutral-400 hover:bg-neutral-50"}`}>{item.label}</button>)}
            </div>
          </div>;
        })}
      </div>
      <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved ? <div className="flex flex-col gap-1 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold">Attendance saved successfully.</span><span className="text-xs">The register is now recorded for this class and date.</span></div> : <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-neutral-500">{remaining ? <><Bdi>{remaining}</Bdi> students still need a status.</> : "Every student has a status."}</p><button type="button" onClick={submit} disabled={isPending || students.length === 0 || remaining > 0} className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{isPending ? "Saving attendance…" : `Save attendance · ${students.length} students`}</button></div>}
      </div>
    </div>
  );
}
