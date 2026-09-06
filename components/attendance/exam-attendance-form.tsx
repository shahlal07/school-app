"use client";

import { useMemo, useState, useTransition } from "react";
import { submitExamAttendance } from "@/lib/attendance/exam-actions";
import type { ExamAttendanceStatus } from "@/types/attendance";

interface Student { id: string; roll_no: string; name: string; }
interface Props { scheduleItemId: string; students: Student[]; existing: Record<string, ExamAttendanceStatus>; submitted: boolean; }

const STATUS: { value: ExamAttendanceStatus; label: string }[] = [
  { value: "present", label: "P" },
  { value: "absent", label: "A" },
  { value: "excused", label: "E" }
];

const styles: Record<ExamAttendanceStatus, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-700",
  absent: "border-red-200 bg-red-50 text-red-700",
  excused: "border-violet-200 bg-violet-50 text-violet-700"
};

export function ExamAttendanceForm({ scheduleItemId, students, existing, submitted }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ExamAttendanceStatus>>(() => {
    const initial: Record<string, ExamAttendanceStatus> = {};
    students.forEach((student) => { initial[student.id] = existing[student.id] ?? "present"; });
    return initial;
  });
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(submitted);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) => `${student.roll_no} ${student.name}`.toLowerCase().includes(needle));
  }, [query, students]);

  const counts = useMemo(() => {
    const values = Object.values(statuses);
    return {
      present: values.filter((value) => value === "present").length,
      absent: values.filter((value) => value === "absent").length,
      excused: values.filter((value) => value === "excused").length
    };
  }, [statuses]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitExamAttendance({
        scheduleItemId,
        records: students.map((student) => ({
          studentId: student.id,
          rollNo: student.roll_no,
          status: statuses[student.id]
        }))
      });
      if (!result.ok) {
        setError("Exam attendance could not be saved.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Exam attendance</p>
            <p className="mt-1 text-sm text-neutral-600">Use the same roll-number roster. Present by default; mark only exceptions.</p>
          </div>
          <div className="flex gap-2 text-xs font-medium">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Present {counts.present}</span>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Absent {counts.absent}</span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Excused {counts.excused}</span>
          </div>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search roll number or student name"
          className="mt-3 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-primary-400"
          aria-label="Search exam attendance roster"
        />
      </div>

      <div className="divide-y divide-neutral-100">
        {visibleStudents.map((student) => {
          const current = statuses[student.id];
          return (
            <div key={student.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-10 text-center text-sm font-semibold tabular-nums text-neutral-500">{student.roll_no}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{student.name}</span>
              <div className="flex gap-1">
                {STATUS.map((item) => (
                  <button key={item.value} type="button" disabled={saved || isPending} onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: item.value }))} aria-pressed={current === item.value} className={`h-8 min-w-8 rounded-lg border px-1.5 text-xs font-bold transition ${current === item.value ? styles[item.value] : "border-neutral-200 bg-white text-neutral-400 hover:bg-neutral-50"}`}>{item.label}</button>
                ))}
              </div>
            </div>
          );
        })}
        {visibleStudents.length === 0 && <div className="px-4 py-8 text-center text-sm text-neutral-500">No students match this search.</div>}
      </div>

      <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved ? (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span className="font-semibold">Exam attendance recorded.</span><span className="ml-2 text-xs">Students marked Absent/Excused are handled separately by result reconciliation.</span></div>
        ) : (
          <button type="button" onClick={submit} disabled={isPending || students.length === 0} className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{isPending ? "Submitting exam attendance…" : `Submit exam attendance · ${students.length} students`}</button>
        )}
      </div>
    </div>
  );
}
