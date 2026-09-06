import Link from "next/link";
import type { AttendanceAcademicSignal, ExamAttendanceReconciliationRow } from "@/types/attendance";
import type { TeacherAttendanceComplianceRow } from "@/lib/attendance/teacher-compliance";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

interface TrendRow { attendance_date: string; attendance_percentage: number; total_students: number; absent_count: number; }

function signalLabel(signal: AttendanceAcademicSignal["signal"], t: (key: string) => string) {
  if (signal === "attendance_and_academic") return t("attendanceLeadership.bridge.signalAttendanceAndAcademic");
  if (signal === "attendance_primary") return t("attendanceLeadership.bridge.signalAttendancePrimary");
  if (signal === "academic_despite_attendance") return t("attendanceLeadership.bridge.signalAcademicDespiteAttendance");
  return t("attendanceLeadership.bridge.signalNormal");
}
function signalClass(signal: AttendanceAcademicSignal["signal"]) {
  if (signal === "attendance_and_academic") return "bg-red-50 text-red-700";
  if (signal === "attendance_primary") return "bg-amber-50 text-amber-700";
  return "bg-violet-50 text-violet-700";
}

export async function AcademicOperationsBridge({ signals, examExceptions, trend, teacherCompliance, attendanceHref }: { signals: AttendanceAcademicSignal[]; examExceptions: ExamAttendanceReconciliationRow[]; trend: TrendRow[]; teacherCompliance: TeacherAttendanceComplianceRow[]; attendanceHref: string }) {
  const t = await getT();
  const latest = trend.at(-1);
  const previous = trend.length > 1 ? trend[trend.length - 2] : null;
  const delta = latest && previous ? Math.round((latest.attendance_percentage - previous.attendance_percentage) * 10) / 10 : null;
  const teachersNeedingAttention = teacherCompliance.filter((teacher) => teacher.compliance_percentage < 90).slice(0, 6);
  const trendMax = Math.max(100, ...trend.map((row) => row.attendance_percentage));
  const trendMin = Math.min(0, ...trend.map((row) => row.attendance_percentage));
  const trendRange = Math.max(1, trendMax - trendMin);

  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("attendanceLeadership.bridge.eyebrow")}</p><h2 className="mt-1 text-lg font-semibold text-neutral-900">{t("attendanceLeadership.bridge.title")}</h2><p className="mt-1 text-xs text-neutral-500">{t("attendanceLeadership.bridge.description")}</p></div><Link href={attendanceHref} className="text-xs font-semibold text-primary-600">{t("attendanceLeadership.bridge.openAttendanceCenter")}</Link></div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">{t("attendanceLeadership.bridge.latestAttendance")}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{latest?.attendance_percentage ?? 0}%</p>{delta !== null&&<p className={`mt-1 text-xs font-medium ${delta>=0?"text-emerald-700":"text-red-700"}`}>{delta>0?"+":""}{delta}% {t("attendanceLeadership.bridge.vsPreviousDay")}</p>}</div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">{t("attendanceLeadership.bridge.studentsNeedingAttention")}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{signals.length}</p><p className="mt-1 text-xs text-neutral-500">{t("attendanceLeadership.bridge.attendanceAcademicSignals")}</p></div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">{t("attendanceLeadership.bridge.examResultExceptions")}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{examExceptions.length}</p><p className="mt-1 text-xs text-neutral-500">{t("attendanceLeadership.bridge.presentInExamResultMissing")}</p></div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">{t("attendanceLeadership.bridge.teachersNeedingAttention")}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{teachersNeedingAttention.length}</p><p className="mt-1 text-xs text-neutral-500">{t("attendanceLeadership.bridge.attendanceSubmissionCompliance")}</p></div>
        </div>
        <div className="border-t border-neutral-100 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-neutral-800">{t("attendanceLeadership.bridge.trendTitle")}</h3><p className="mt-0.5 text-xs text-neutral-500">{t("attendanceLeadership.bridge.trendSubtitle")}</p></div><span className="text-xs tabular-nums text-neutral-500">{trend.length} {t("attendanceLeadership.bridge.daysSuffix")}</span></div>
          {trend.length === 0 ? <p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">{t("attendanceLeadership.bridge.noSubmittedDays")}</p> : <div className="overflow-x-auto"><div className="flex min-w-[560px] items-end gap-2 rounded-xl bg-neutral-50 px-3 py-4" style={{height:190}}>{trend.map((row)=><div key={row.attendance_date} className="flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-semibold tabular-nums text-neutral-600">{row.attendance_percentage}%</span><div title={`${row.attendance_date}: ${row.attendance_percentage}%`} className="w-full max-w-10 rounded-t-md bg-primary-500 transition-all" style={{height:`${Math.max(8,((row.attendance_percentage-trendMin)/trendRange)*125)}px`}}/><span className="text-[9px] tabular-nums text-neutral-400">{row.attendance_date.slice(5)}</span></div>)}</div></div>}
        </div>
        <div className="grid gap-5 border-t border-neutral-100 p-4 sm:grid-cols-3 sm:p-5">
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-neutral-800">{t("attendanceLeadership.bridge.studentsNeedingAttention")}</h3></div><div className="space-y-2">{signals.slice(0,6).map((student)=><div key={student.student_id} className="rounded-xl border border-neutral-100 px-3 py-3"><div className="flex items-start gap-3"><span className="w-10 shrink-0 pt-0.5 text-center text-sm font-semibold tabular-nums text-neutral-500"><Bdi>{student.roll_no}</Bdi></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{student.name}</Bdi></p><p className="mt-0.5 text-xs text-neutral-500">{t("attendanceLeadership.bridge.attendanceLabel")} {student.attendance_percentage??"—"}% · {t("attendanceLeadership.bridge.assessmentLabel")} {student.assessment_percentage??"—"}%</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${signalClass(student.signal)}`}>{signalLabel(student.signal, t)}</span></div></div>)}{signals.length===0&&<p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">{t("attendanceLeadership.bridge.noStudentSignal")}</p>}</div></div>
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-neutral-800">{t("attendanceLeadership.bridge.teacherComplianceTitle")}</h3></div><div className="space-y-2">{teachersNeedingAttention.map((teacher)=><div key={teacher.teacher_id} className="rounded-xl border border-neutral-100 px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{teacher.teacher_name}</Bdi></p><p className="mt-0.5 text-xs text-neutral-500">{teacher.submitted_class_days}/{teacher.expected_class_days} {t("attendanceLeadership.bridge.classDaysSubmitted")}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold tabular-nums text-amber-700">{teacher.compliance_percentage}%</span></div></div>)}{teachersNeedingAttention.length===0&&<p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">{t("attendanceLeadership.bridge.allTeachersCompliant")}</p>}</div></div>
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-neutral-800">{t("attendanceLeadership.bridge.examExceptionsTitle")}</h3></div><div className="space-y-2">{examExceptions.slice(0,6).map((item,index)=><Link key={`${item.schedule_item_id}-${item.student_id}-${index}`} href={`/teacher/exams/${item.schedule_item_id}`} className="block rounded-xl border border-neutral-100 px-3 py-3 hover:bg-neutral-50"><div className="flex items-start gap-3"><span className="w-10 shrink-0 pt-0.5 text-center text-sm font-semibold tabular-nums text-neutral-500"><Bdi>{item.roll_no}</Bdi></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{item.name}</Bdi></p><p className="truncate text-xs text-neutral-500"><Bdi>{item.title}</Bdi> · <Bdi>{item.scheduled_date}</Bdi></p></div><span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">{t("attendanceLeadership.bridge.resultMissing")}</span></div></Link>)}{examExceptions.length===0&&<p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">{t("attendanceLeadership.bridge.noResultExceptions")}</p>}</div></div>
        </div>
      </section>
    </div>
  );
}
