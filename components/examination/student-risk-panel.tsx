import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { passRateVariant } from "@/components/examination/performance-types";

export interface StudentRiskRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  averagePercent: number;
  passRate: number;
  gradedCount: number;
}

export function StudentRiskPanel({ students }: { students: StudentRiskRow[] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Students needing attention</h2>
          <p className="mt-1 text-xs text-neutral-500">Signal based on at least 2 graded assessments: low average or repeated failure.</p>
        </div>
        <Badge variant={students.length ? "warning" : "success"}>{students.length} flagged</Badge>
      </div>
      {students.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No student meets the current risk threshold.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {students.map((student) => (
            <div key={student.studentId} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{student.studentName}</p>
                <p className="text-xs text-neutral-500">Roll {student.rollNo} · {student.className} · {student.gradedCount} graded</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={passRateVariant(student.passRate)}>{student.passRate}% pass</Badge>
                <Badge variant={student.averagePercent < 50 ? "danger" : "warning"}>{student.averagePercent}% avg</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link href="/coordinator/performance" className="mt-3 inline-block text-xs font-medium text-primary-600 hover:underline">Open performance dashboard →</Link>
    </section>
  );
}
