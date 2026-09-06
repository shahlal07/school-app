"use client";

import { useMemo, useState, useTransition } from "react";
import { submitClassAttendance } from "@/lib/attendance/actions";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Bdi } from "@/components/shared/bdi";
import type { AttendanceStatus } from "@/types/attendance";

interface Student {
  id: string;
  roll_no: string;
  name: string;
}

interface Props {
  students: Student[];
  classId: string;
  sectionId: string;
  attendanceDate: string;
  existing?: Record<string, AttendanceStatus>;
  submitted?: boolean;
}

const STATUS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "P" },
  { value: "absent", label: "A" },
  { value: "late", label: "L" },
  { value: "leave", label: "Lv" },
  { value: "excused", label: "E" }
];

const statusClass: Record<AttendanceStatus, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-700",
  absent: "border-red-200 bg-red-50 text-red-700",
  late: "border-amber-200 bg-amber-50 text-amber-700",
  leave: "border-sky-200 bg-sky-50 text-sky-700",
  excused: "border-violet-200 bg-violet-50 text-violet-700"
};

export function ClassAttendanceForm({ students, classId, sectionId, attendanceDate, existing, submitted }: Props) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(submitted));
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    students.forEach((student) => { initial[student.id] = existing?.[student.id] ?? "present"; });
    return initial;
  });

  const counts = useMemo(() => {
    const values = Object.values(statuses);
    return {
      present: values.filter((v) => v === "present").length,
      absent: values.filter((v) => v === "absent").length,
      late: values.filter((v) => v === "late").length
    };
  }, [statuses]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitClassAttendance({
        class_id: classId,
        section_id: sectionId,
        attendance_date: attendanceDate,
        records: students.map((student) => ({ student_id: student.id, status: statuses[student.id] }))
      });
      if (!result.ok) {
        setError(t("teacher.attendance.classForm.errorSaving"));
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("teacher.attendance.classForm.eyebrow")}</p>
          <p className="mt-1 text-sm text-neutral-600">{t("teacher.attendance.classForm.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{t("teacher.attendance.presentLabel")} <Bdi>{counts.present}</Bdi></span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{t("teacher.attendance.absentLabel")} <Bdi>{counts.absent}</Bdi></span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{t("teacher.attendance.lateLabel")} <Bdi>{counts.late}</Bdi></span>
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {students.map((student) => {
          const current = statuses[student.id];
          return (
            <div key={student.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-10 text-center text-sm font-semibold tabular-nums text-neutral-500"><Bdi>{student.roll_no}</Bdi></span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900"><Bdi>{student.name}</Bdi></span>
              <div className="flex gap-1">
                {STATUS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    disabled={saved || isPending}
                    onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: item.value }))}
                    className={`h-8 min-w-8 rounded-lg border px-1.5 text-xs font-bold transition ${current === item.value ? statusClass[item.value] : "border-neutral-200 bg-white text-neutral-400 hover:bg-neutral-50"}`}
                    aria-label={`${student.name}: ${item.value}`}
                    aria-pressed={current === item.value}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-semibold">{t("teacher.attendance.classForm.submittedMessage")}</span>
            <span className="text-xs">{t("teacher.attendance.classForm.submittedSubMessage")}</span>
          </div>
        ) : (
          <button type="button" onClick={submit} disabled={isPending || students.length === 0} className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? t("teacher.attendance.classForm.submitting") : <>{t("teacher.attendance.classForm.submitPrefix")} · <Bdi>{students.length}</Bdi> {t("teacher.attendance.studentsSuffix")}</>}
          </button>
        )}
      </div>
    </div>
  );
}
