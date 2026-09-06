import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getFullExamSetReport } from "@/lib/examination/exam-set-report-data";
import { DownloadWorkbookButton } from "./download-workbook-button";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

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
  const t = await getT();

  const full = await getFullExamSetReport(supabase, examSetId);

  if (!full) {
    return (
      <main className="flex flex-col gap-5 p-4 sm:p-6">
        <Card>
          <CardContent>
            <EmptyState
              title={t("coordinator.examSetReport.notFoundTitle")}
              description={t("coordinator.examSetReport.notFoundDescription")}
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
          <Bdi>{klass?.name ?? t("coordinator.fallback.unknownClass")}</Bdi> · {t("coordinator.examSets.setWord")} #{examSet.set_number}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {formatScope(examSet.assessment_scope)} {t("coordinator.examSetReport.performanceReportSuffix")}
        </p>
      </div>
      <Link
        href="/coordinator/exam-sets"
        className="text-sm font-medium text-primary-600 hover:underline"
      >
        {t("coordinator.examSetReport.backToExamSets")}
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
              title={t("coordinator.examSetReport.inProgressTitle")}
              description={`${completedSubjectSlots} ${t("coordinator.examSetReport.inProgressDescriptionOf")} ${totalSubjectSlots} ${
                totalSubjectSlots === 1 ? t("coordinator.examSetReport.subjectSingular") : t("coordinator.examSetReport.subjectPlural")
              } ${t("coordinator.examSetReport.inProgressDescriptionSuffix")}`}
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
          <CardTitle>{t("coordinator.examSetReport.executiveSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.assessmentScope")}</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {formatScope(examSet.assessment_scope)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.duration")}</dt>
              <dd className="text-sm font-medium text-neutral-900">
                <Bdi>{examSet.started_on ?? "—"}</Bdi> → <Bdi>{examSet.completed_on ?? "—"}</Bdi>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.totalStudents")}</dt>
              <dd className="text-sm font-medium text-neutral-900">{report.totalStudents}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.overallAverage")}</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {formatPct(report.overallAverage)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.overallPassRate")}</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {formatPct(report.overallPassRate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.strongestSubject")}</dt>
              <dd className="text-sm font-medium text-neutral-900">
                {report.strongestSubject
                  ? `${report.strongestSubject.subjectName} (${formatPct(report.strongestSubject.average)})`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t("coordinator.examSetReport.weakestSubject")}</dt>
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
          <CardTitle>{t("coordinator.examSetReport.subjectAnalysis")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.subjects.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("coordinator.examSetReport.noSubjectsInSet")}</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.subject")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.teacher")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.average")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.passRate")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.highest")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.lowest")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.failures")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.changeVsPrevious")}</th>
                </tr>
              </thead>
              <tbody>
                {report.subjects.map((s) => (
                  <tr key={s.subjectId} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 font-medium text-neutral-900"><Bdi>{s.subjectName}</Bdi></td>
                    <td className="py-2 pr-3 text-neutral-600"><Bdi>{s.teacherName ?? "—"}</Bdi></td>
                    <td className="py-2 pr-3 text-neutral-900">{formatPct(s.average)}</td>
                    <td className="py-2 pr-3 text-neutral-900">{formatPct(s.passRate)}</td>
                    <td className="py-2 pr-3 text-neutral-600">{formatPct(s.highest)}</td>
                    <td className="py-2 pr-3 text-neutral-600">{formatPct(s.lowest)}</td>
                    <td className="py-2 pr-3 text-neutral-600">{s.failureCount}</td>
                    <td className="py-2 pr-3 text-neutral-600">
                      {s.changeVsPreviousSet === null
                        ? prevSet
                          ? "—"
                          : t("coordinator.examSetReport.firstSet")
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
          <CardTitle>{t("coordinator.examSetReport.studentRankings")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.rankings.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("coordinator.examSetReport.noGradedResultsYet")}</p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.rank")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.rollNo")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.name")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.obtainedPossible")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.percentage")}</th>
                  <th className="py-2 pr-3 font-medium">{t("coordinator.examSetReport.subjectFailures")}</th>
                </tr>
              </thead>
              <tbody>
                {report.rankings.slice(0, 10).map((r, index) => (
                  <tr key={r.studentId} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 text-neutral-900">{index + 1}</td>
                    <td className="py-2 pr-3 text-neutral-600"><Bdi>{r.rollNo}</Bdi></td>
                    <td className="py-2 pr-3 font-medium text-neutral-900"><Bdi>{r.name}</Bdi></td>
                    <td className="py-2 pr-3 text-neutral-600">
                      <Bdi>{r.totalObtained} / {r.totalPossible}</Bdi>
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
          <CardTitle>{t("coordinator.examSetReport.performanceBands")}</CardTitle>
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
          <CardTitle>{t("coordinator.examSetReport.studentsRequiringAttention")}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.studentsRequiringAttention.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {t("coordinator.examSetReport.noStudentsFlagged")}
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
                      <Bdi>{s.name}</Bdi> <span className="text-neutral-500">· {t("coordinator.examSetReport.rollWord")} #<Bdi>{s.rollNo}</Bdi></span>
                    </p>
                    <p className="text-xs text-neutral-500"><Bdi>{s.reason}</Bdi></p>
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
