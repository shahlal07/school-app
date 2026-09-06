import { getAttendanceAcademicSignals } from "@/lib/attendance/integration";
import { createIntervention } from "./actions";
import type { AttendanceAcademicSignal } from "@/types/attendance";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

function plusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function recommendation(signal: AttendanceAcademicSignal["signal"], t: (key: string) => string) {
  if (signal === "attendance_and_academic") return { action: t("coordinator.attendanceRecommendations.attendanceAndAcademicAction"), notes: t("coordinator.attendanceRecommendations.attendanceAndAcademicNotes") };
  if (signal === "attendance_primary") return { action: t("coordinator.attendanceRecommendations.attendancePrimaryAction"), notes: t("coordinator.attendanceRecommendations.attendancePrimaryNotes") };
  return { action: t("coordinator.attendanceRecommendations.academicPrimaryAction"), notes: t("coordinator.attendanceRecommendations.academicPrimaryNotes") };
}

export async function AttendanceInterventionRecommendations({ canManage }: { canManage: boolean }) {
  if (!canManage) return null;
  const t = await getT();
  const { rows } = await getAttendanceAcademicSignals(8);
  const dueDate = plusDays(7);
  const followUpDate = plusDays(14);
  async function submitRecommendation(formData: FormData) { "use server"; await createIntervention(formData); }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40">
      <div className="border-b border-amber-100 px-4 py-4 sm:px-5"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t("coordinator.attendanceRecommendations.recommendedActions")}</p><h2 className="mt-1 text-lg font-semibold text-neutral-900">{t("coordinator.attendanceRecommendations.heading")}</h2><p className="mt-1 text-xs text-neutral-600">{t("coordinator.attendanceRecommendations.description")}</p></div>
      <div className="divide-y divide-amber-100">
        {rows.map((student) => { const rec = recommendation(student.signal, t); return <div key={student.student_id} className="px-4 py-4 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">#<Bdi>{student.roll_no}</Bdi> · <Bdi>{student.name}</Bdi></p><p className="mt-1 text-xs text-neutral-600">{t("coordinator.attendanceRecommendations.attendanceWord")} <Bdi>{student.attendance_percentage ?? "—"}%</Bdi> · {t("coordinator.attendanceRecommendations.assessmentWord")} <Bdi>{student.assessment_percentage ?? "—"}%</Bdi></p><p className="mt-1 text-xs text-neutral-700">{rec.notes}</p></div><form action={submitRecommendation}><input type="hidden" name="studentId" value={student.student_id}/><input type="hidden" name="subjectId" value=""/><input type="hidden" name="assignedTo" value=""/><input type="hidden" name="dueDate" value={dueDate}/><input type="hidden" name="followUpDate" value={followUpDate}/><input type="hidden" name="action" value={rec.action}/><input type="hidden" name="notes" value={rec.notes}/><button type="submit" className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">{t("coordinator.attendanceRecommendations.assign")}</button></form></div></div>; })}
        {rows.length===0&&<div className="px-4 py-8 text-center text-sm text-neutral-600">{t("coordinator.attendanceRecommendations.none")}</div>}
      </div>
    </section>
  );
}
