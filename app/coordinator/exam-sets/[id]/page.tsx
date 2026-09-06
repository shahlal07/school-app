import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getFullExamSetReport } from "@/lib/examination/exam-set-report-data";
import { DownloadWorkbookButton } from "./download-workbook-button";

function formatScope(scope: string): string {
  return scope.replace(/_/g, " ");
}

function formatPct(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export default async function ExamSetReportPage({ params }: { params: { id: string } }) {
  await requireAnyRole(["owner", "academic_coordinator"]);
  const supabase = createClient();
  const examSetId = params.id;

  const full = await getFullExamSetReport(supabase, examSetId);

  if (!full) {
    return (
      <main className="flex flex-col gap-5 p-4 sm:p-6">
        <Card>
          <CardContent>
            <EmptyState
              title="Exam set not found."
              description="This exam set may have been removed."
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  const { examSet, klass, totalSubjectSlots, completedSubjectSlots, prevSet, report } = full;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {klass?.name ?? "Unknown class"} · Set #{examSet.set_number}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {formatScope(examSet.assessment_scope)} performance report
        </p>
      </div>
      <Link
        href="/coordinator/exam-sets"
        className="text-sm font-medium text-primary-600 hover:underline"
      >
        Back to exam sets
      </Link>
    </div>
  );

  if (examSet.status !== "completed" || !report) {
    return (
      <main className="flex flex-col gap-5 p-4 sm:p-6">
        {header}
        <Card>
          <CardContent>
            <EmptyState
              title="This exam set is still in progress."
              description={`${completedSubjectSlots} of ${totalSubjectSlots} subject${
                totalSubjectSlots === 1 ? "" : "s"
              } completed - the performance report will be available once every subject is finalized.`}
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  const bandOrder: (keyof typeof report.performanceBands)[] = [
    "90-100",
    "80-89",
    "70-79",
    "60-69",
    "50-59",
    "below-50"
  ];

  return (
    <main className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {header}
        <DownloadWorkbookButton examSetId={examSet.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-neutral-500">Assessment scope</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {formatScope(examSet.assessment_scope)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Duration</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {examSet.started_on ?? "—"} → {examSet.completed_on ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Total students</dt>
              <dd className="text-sm font-medium text-neutral-900">{report.totalStudents}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Overall average</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {formatPct(report.overallAverage)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Overall pass rate</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {formatPct(report.overallPassRate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Strongest subject</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {report.strongestSubject
                  ? `${report.strongestSubject.subjectName} (${formatPct(report.strongestSubject.average)})`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Weakest subject</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {report.weakestSubject
                  ? `${report.weakestSubject.subjectName} (${formatPct(report.weakestSubject.average)})`
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject analysis</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.subjects.length === 0 ? (
            <p className="text-sm text-neutral-500">No subjects in this exam set.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Subject</th>
                  <th className="py-2 pr-3 font-medium">Teacher</th>
                  <th className="py-2 pr-3 font-medium">Average</th>
                  <th className="py-2 pr-3 font-medium">Pass rate</th>
                  <th className="py-2 pr-3 font-medium">Highest</th>
                  <th className="py-2 pr-3 font-medium">Lowest</th>
                  <th className="py-2 pr-3 font-medium">Failures</th>
                  <th className="py-2 pr-3 font-medium">Change vs previous set</th>
                </tr>
              </thead>
              <tbody>
                {report.subjects.map((s) => (
                  <tr key={s.subjectId} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 font-medium text-neutral-900">{s.subjectName}</td>
                    <td className="py-2 pr-3 text-neutral-600">{s.teacherName ?? "—"}</td>
                    <td className="py-2 pr-3 text-neutral-900">{formatPct(s.average)}</td>
                    <td className="py-2 pr-3 text-neutral-900">{formatPct(s.passRate)}</td>
                    <td className="py-2 pr-3 text-neutral-600">{formatPct(s.highest)}</td>
                    <td className="py-2 pr-3 text-neutral-600">{formatPct(s.lowest)}</td>
                    <td className="py-2 pr-3 text-neutral-600">{s.failureCount}</td>
                    <td className="py-2 pr-3 text-neutral-600">
                      {s.changeVsPreviousSet === null
                        ? prevSet
                          ? "—"
                          : "First set"
                        : `${s.changeVsPreviousSet > 0 ? "+" : ""}${s.changeVsPreviousSet}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student rankings (top 10)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.rankings.length === 0 ? (
            <p className="text-sm text-neutral-500">No graded results yet.</p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Rank</th>
                  <th className="py-2 pr-3 font-medium">Roll no</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Obtained / possible</th>
                  <th className="py-2 pr-3 font-medium">Percentage</th>
                  <th className="py-2 pr-3 font-medium">Subject failures</th>
                </tr>
              </thead>
              <tbody>
                {report.rankings.slice(0, 10).map((r, index) => (
                  <tr key={r.studentId} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 text-neutral-900">{index + 1}</td>
                    <td className="py-2 pr-3 text-neutral-600">{r.rollNo}</td>
                    <td className="py-2 pr-3 font-medium text-neutral-900">{r.name}</td>
                    <td className="py-2 pr-3 text-neutral-600">
                      {r.totalObtained} / {r.totalPossible}
                    </td>
                    <td className="py-2 pr-3 text-neutral-900">{r.percentage}%</td>
                    <td className="py-2 pr-3 text-neutral-600">{r.subjectFailures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance bands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {bandOrder.map((band) => (
              <div
                key={band}
                className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 px-4 py-3"
              >
                <span className="text-lg font-semibold text-neutral-900">
                  {report.performanceBands[band]}
                </span>
                <Badge variant="neutral">{band}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students requiring attention</CardTitle>
        </CardHeader>
        <CardContent>
          {report.studentsRequiringAttention.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No students currently meet the attention criteria for this set.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {report.studentsRequiringAttention.map((s) => (
                <div
                  key={s.studentId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {s.name} <span className="text-neutral-500">· Roll #{s.rollNo}</span>
                    </p>
                    <p className="text-xs text-neutral-500">{s.reason}</p>
                  </div>
                  <Badge variant="danger">{s.percentage}%</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
