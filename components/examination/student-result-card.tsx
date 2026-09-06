import Link from "next/link";
import { notFound } from "next/navigation";

import type { Class, Section, Student, Subject } from "@/types/examination";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  averageMarksPercent,
  makePassRateStat,
  passRateVariant,
  type GradedResultRow
} from "@/components/examination/performance-types";

interface PassAcc {
  passed: number;
  total: number;
}

interface SubjectRow {
  subjectId: string;
  subjectName: string;
  testsTaken: number;
  absences: number;
  passRate: number;
  passed: number;
  graded: number;
  averagePercent: number | null;
}

function bumpAcc(map: Map<string, PassAcc>, key: string, didPass: boolean) {
  const acc = map.get(key) ?? { passed: 0, total: 0 };
  acc.total += 1;
  if (didPass) acc.passed += 1;
  map.set(key, acc);
}

/**
 * Shared per-student result-card renderer, used by both /owner/students/[id]
 * (owner) and /principal/students/[id] (principal) - both roles have the
 * same read access to test_results here (is_owner()/can_view_school_wide()),
 * so this is one implementation with a caller-supplied back-link rather than
 * duplicated per role. Each embedding page.tsx owns its own auth guard
 * (inherited from its segment's layout) - this component does no auth itself.
 */
export async function StudentResultCard({
  studentId,
  backHref
}: {
  studentId: string;
  backHref: string;
}) {
  const supabase = createClient();

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !studentRow) {
    notFound();
  }

  const student = studentRow as Student;

  const [classRes, sectionRes, resultsRes, scheduleRes, subjectsRes] = await Promise.all([
    supabase.from("classes").select("*").eq("id", student.class_id).maybeSingle(),
    supabase.from("sections").select("*").eq("id", student.section_id).maybeSingle(),
    supabase.from("test_results").select("*").eq("student_id", studentId),
    supabase.from("schedule_items").select("*"),
    supabase.from("subjects").select("*")
  ]);

  const klass = classRes.data as Class | null;
  const section = sectionRes.data as Section | null;
  const results = (resultsRes.data as GradedResultRow[] | null) ?? [];
  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];

  const scheduleById = new Map(scheduleItems.map((item) => [item.id, item]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  const classAndSection = [klass?.name, section ? `Section ${section.name}` : null]
    .filter(Boolean)
    .join(" - ");

  const header = (
    <div className="flex flex-col gap-1">
      <Link href={backHref} className="text-sm font-medium text-primary-600 hover:text-primary-700">
        &larr; Back to students
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-neutral-900">{student.name}</h1>
      <p className="text-sm text-neutral-500">
        Roll #{student.roll_no}
        {classAndSection ? ` · ${classAndSection}` : ""}
      </p>
      {!student.is_active && (
        <div>
          <Badge variant="neutral">Inactive</Badge>
        </div>
      )}
    </div>
  );

  if (results.length === 0) {
    return (
      <main className="p-4 sm:p-6">
        {header}
        <div className="mt-5">
          <EmptyState
            title="No results yet"
            description="This student's result card will populate once a teacher enters marks for one of their tests."
          />
        </div>
      </main>
    );
  }

  let totalAbsences = 0;
  const gradedAcc: PassAcc = { passed: 0, total: 0 };
  const subjectAcc = new Map<string, PassAcc>();
  const subjectTestsTaken = new Map<string, number>();
  const subjectRowsBySubject = new Map<string, GradedResultRow[]>();

  for (const result of results) {
    if (result.is_absent) totalAbsences += 1;

    const scheduleItem = scheduleById.get(result.schedule_item_id);
    if (!scheduleItem) continue;

    const didPass = result.is_pass === true;
    if (result.is_pass !== null) {
      gradedAcc.total += 1;
      if (didPass) gradedAcc.passed += 1;
      bumpAcc(subjectAcc, scheduleItem.subject_id, didPass);
    }

    subjectTestsTaken.set(
      scheduleItem.subject_id,
      (subjectTestsTaken.get(scheduleItem.subject_id) ?? 0) + 1
    );

    const rows = subjectRowsBySubject.get(scheduleItem.subject_id) ?? [];
    rows.push(result);
    subjectRowsBySubject.set(scheduleItem.subject_id, rows);
  }

  const overallPassRate = makePassRateStat(gradedAcc.passed, gradedAcc.total);
  const overallAverage = averageMarksPercent(results);

  const subjectRows: SubjectRow[] = Array.from(subjectTestsTaken.keys())
    .map((subjectId) => {
      const acc = subjectAcc.get(subjectId) ?? { passed: 0, total: 0 };
      const stat = makePassRateStat(acc.passed, acc.total);
      const rowsForSubject = subjectRowsBySubject.get(subjectId) ?? [];
      return {
        subjectId,
        subjectName: subjectById.get(subjectId)?.name ?? "Unknown subject",
        testsTaken: subjectTestsTaken.get(subjectId) ?? 0,
        absences: rowsForSubject.filter((r) => r.is_absent).length,
        passRate: stat.passRate,
        passed: stat.passed,
        graded: stat.total,
        averagePercent: averageMarksPercent(rowsForSubject)
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  return (
    <main className="p-4 sm:p-6">
      {header}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Average marks
            </span>
            <span className="text-2xl font-semibold text-neutral-900">
              {overallAverage !== null ? `${overallAverage}%` : "—"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Pass rate
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-neutral-900">
                {overallPassRate.passRate}%
              </span>
              <Badge variant={passRateVariant(overallPassRate.passRate)}>
                {overallPassRate.passed}/{overallPassRate.total}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Tests taken
            </span>
            <span className="text-2xl font-semibold text-neutral-900">{results.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Absences
            </span>
            <span className="text-2xl font-semibold text-neutral-900">{totalAbsences}</span>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>Per-subject breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Subject</th>
                    <th className="py-2 pr-3 font-medium">Tests taken</th>
                    <th className="py-2 pr-3 font-medium">Pass rate</th>
                    <th className="py-2 pr-3 font-medium">Average %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {subjectRows.map((row) => (
                    <tr key={row.subjectId}>
                      <td className="py-2 pr-3 font-medium text-neutral-800">{row.subjectName}</td>
                      <td className="py-2 pr-3 text-neutral-600">{row.testsTaken}</td>
                      <td className="py-2 pr-3">
                        {row.graded > 0 ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={passRateVariant(row.passRate)}>{row.passRate}%</Badge>
                            <span className="text-xs text-neutral-400">
                              {row.passed}/{row.graded}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Not graded yet</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-neutral-600">
                        {row.averagePercent !== null ? `${row.averagePercent}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
