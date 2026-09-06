"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Student } from "@/types/examination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { saveTestResults, type TestResultInput } from "@/app/teacher/exams/[id]/actions";

export interface ExistingTestResult {
  student_id: string;
  marks_obtained: number | null;
  total_marks: number;
  is_absent: boolean;
  is_pass: boolean | null;
}

export interface ExamResultsRosterProps {
  scheduleItemId: string;
  students: Student[];
  existingResults: ExistingTestResult[];
}

interface RowState {
  marks: string;
  absent: boolean;
  isPass: boolean | null;
}

function ExamResultsRosterInner({
  scheduleItemId,
  students,
  existingResults
}: ExamResultsRosterProps) {
  const router = useRouter();
  const { toast } = useToast();

  const resultByStudent = useMemo(
    () => new Map(existingResults.map((r) => [r.student_id, r])),
    [existingResults]
  );

  const defaultTotalMarks = existingResults[0]?.total_marks ?? 10;

  const [totalMarks, setTotalMarks] = useState(String(defaultTotalMarks));
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const student of students) {
      const existing = resultByStudent.get(student.id);
      initial[student.id] = {
        marks: existing?.marks_obtained != null ? String(existing.marks_obtained) : "",
        absent: existing?.is_absent ?? false,
        isPass: existing?.is_pass ?? null
      };
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true })),
    [students]
  );

  const updateRow = (studentId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch }
    }));
  };

  const handleSaveAll = async () => {
    const parsedTotal = Number(totalMarks);
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      toast("Enter a valid total marks value first.", "danger");
      return;
    }

    const results: TestResultInput[] = sortedStudents.map((student) => {
      const row = rows[student.id];
      const marksNumber = row.marks.trim() === "" ? null : Number(row.marks);
      return {
        studentId: student.id,
        isAbsent: row.absent,
        marksObtained:
          row.absent || marksNumber === null || !Number.isFinite(marksNumber)
            ? null
            : marksNumber
      };
    });

    setSaving(true);
    const result = await saveTestResults(scheduleItemId, parsedTotal, results);
    setSaving(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast("Results saved", "success");
    router.refresh();
  };

  if (sortedStudents.length === 0) {
    return <p className="text-sm text-neutral-500">No students found for this class.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-[160px]">
        <Input
          label="Total marks"
          type="number"
          inputMode="decimal"
          min={1}
          value={totalMarks}
          onChange={(e) => setTotalMarks(e.target.value)}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {sortedStudents.map((student) => {
          const row = rows[student.id];
          return (
            <li
              key={student.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {student.name}
                  </p>
                  <p className="text-xs text-neutral-500">Roll #{student.roll_no}</p>
                </div>
                {row.isPass !== null && !row.absent && (
                  <Badge variant={row.isPass ? "success" : "danger"}>
                    {row.isPass ? "Pass" : "Fail"}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="w-28">
                  <Input
                    label="Marks"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    disabled={row.absent}
                    value={row.marks}
                    onChange={(e) => updateRow(student.id, { marks: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    checked={row.absent}
                    onChange={(e) =>
                      updateRow(student.id, {
                        absent: e.target.checked,
                        marks: e.target.checked ? "" : row.marks
                      })
                    }
                  />
                  Absent
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="primary" loading={saving} onClick={handleSaveAll}>
        Save all
      </Button>
    </div>
  );
}

export function ExamResultsRoster(props: ExamResultsRosterProps) {
  return (
    <ToastProvider>
      <ExamResultsRosterInner {...props} />
    </ToastProvider>
  );
}
