import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { passRateVariant } from "@/components/examination/performance-types";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export interface StudentRiskRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  averagePercent: number;
  passRate: number;
  gradedCount: number;
}

export async function StudentRiskPanel({ students }: { students: StudentRiskRow[] }) {
  const t = await getT();
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{t("coordinator.studentRiskPanel.title")}</h2>
          <p className="mt-1 text-xs text-neutral-500">{t("coordinator.studentRiskPanel.subtitle")}</p>
        </div>
        <Badge variant={students.length ? "warning" : "success"}>{students.length} {t("coordinator.studentRiskPanel.flagged")}</Badge>
      </div>
      {students.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">{t("coordinator.studentRiskPanel.noneFlagged")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {students.map((student) => (
            <div key={student.studentId} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900"><Bdi>{student.studentName}</Bdi></p>
                <p className="text-xs text-neutral-500">{t("coordinator.studentRiskPanel.rollWord")} <Bdi>{student.rollNo}</Bdi> · <Bdi>{student.className}</Bdi> · <Bdi>{student.gradedCount}</Bdi> {t("coordinator.studentRiskPanel.gradedWord")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={passRateVariant(student.passRate)}><Bdi>{student.passRate}%</Bdi> {t("coordinator.studentRiskPanel.passWord")}</Badge>
                <Badge variant={student.averagePercent < 50 ? "danger" : "warning"}><Bdi>{student.averagePercent}%</Bdi> {t("coordinator.studentRiskPanel.avgWord")}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link href="/coordinator/performance" className="mt-3 inline-block text-xs font-medium text-primary-600 hover:underline">{t("coordinator.studentRiskPanel.openDashboard")}</Link>
    </section>
  );
}
