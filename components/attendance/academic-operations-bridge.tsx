import Link from "next/link";
import type { AttendanceAcademicSignal, ExamAttendanceReconciliationRow } from "@/types/attendance";
import type { TeacherAttendanceComplianceRow } from "@/lib/attendance/teacher-compliance";

interface TrendRow { attendance_date: string; attendance_percentage: number; total_students: number; absent_count: number; }

function signalLabel(signal: AttendanceAcademicSignal["signal"]) {
  if (signal === "attendance_and_academic") return "Attendance + academic concern";
  if (signal === "attendance_primary") return "Attendance concern";
  if (signal === "academic_despite_attendance") return "Academic concern despite attendance";
  return "Normal";
}

function signalClass(signal: AttendanceAcademicSignal["signal"]) {
  if (signal === "attendance_and_academic") return "bg-red-50 text-red-700";
  if (signal === "attendance_primary") return "bg-amber-50 text-amber-700";
  return "bg-violet-50 text-violet-700";
}

export function AcademicOperationsBridge({ signals, examExceptions, trend, teacherCompliance, attendanceHref }: { signals: AttendanceAcademicSignal[]; examExceptions: ExamAttendanceReconciliationRow[]; trend: TrendRow[]; teacherCompliance: TeacherAttendanceComplianceRow[]; attendanceHref: string }) {
  const latest = trend.at(-1);
  const previous = trend.length > 1 ? trend[trend.length - 2] : null;
  const delta = latest && previous ? Math.round((latest.attendance_percentage - previous.attendance_percentage) * 10) / 10 : null;
  const teachersNeedingAttention = teacherCompliance.filter((teacher) => teacher.compliance_percentage < 90).slice(0, 6);

  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Academic operations</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">Attendance ↔ Examination</h2>
              <p className="mt-1 text-xs text-neutral-500">Daily attendance explains academic risk; exam attendance explains whether a result should exist.</p>
            </div>
            <Link href={attendanceHref} className="text-xs font-semibold text-primary-600">Open attendance center</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Latest attendance</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{latest?.attendance_percentage ?? 0}%</p>{delta !== null && <p className={`mt-1 text-xs font-medium ${delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>{delta > 0 ? "+" : ""}{delta}% vs previous day</p>}</div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Students needing attention</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{signals.length}</p><p className="mt-1 text-xs text-neutral-500">attendance / academic signals</p></div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Exam result exceptions</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{examExceptions.length}</p><p className="mt-1 text-xs text-neutral-500">present in exam, result missing</p></div>
          <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Teachers needing attention</p><p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{teachersNeedingAttention.length}</p><p className="mt-1 text-xs text-neutral-500">attendance submission compliance</p></div>
        </div>

        <div className="grid gap-5 border-t border-neutral-100 p-4 sm:grid-cols-3 sm:p-5">
          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-neutral-800">Students needing attention</h3></div>
            <div className="space-y-2">
              {signals.slice(0, 6).map((student) => <div key={student.student_id} className="rounded-xl border border-neutral-100 px-3 py-3"><div className="flex items-start gap-3"><span className="w-10 shrink-0 pt-0.5 text-center text-sm font-semibold tabular-nums text-neutral-500">{student.roll_no}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900">{student.name}</p><p className="mt-0.5 text-xs text-neutral-500">Attendance {student.attendance_percentage ?? "—"}% · Assessment {student.assessment_percentage ?? "—"}%</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${signalClass(student.signal)}`}>{signalLabel(student.signal)}</span></div></div>)}
              {signals.length === 0 && <p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">No cross-system student risk signal right now.</p>}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-neutral-800">Teacher attendance compliance</h3></div>
            <div className="space-y-2">
              {teachersNeedingAttention.map((teacher) => <div key={teacher.teacher_id} className="rounded-xl border border-neutral-100 px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">{teacher.teacher_name}</p><p className="mt-0.5 text-xs text-neutral-500">{teacher.submitted_class_days}/{teacher.expected_class_days} class-days submitted</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold tabular-nums text-amber-700">{teacher.compliance_percentage}%</span></div></div>)}
              {teachersNeedingAttention.length === 0 && <p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">All tracked class teachers are at 90%+ submission compliance.</p>}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-neutral-800">Exam exceptions</h3></div>
            <div className="space-y-2">
              {examExceptions.slice(0, 6).map((item, index) => <Link key={`${item.schedule_item_id}-${item.student_id}-${index}`} href={`/teacher/exams/${item.schedule_item_id}`} className="block rounded-xl border border-neutral-100 px-3 py-3 hover:bg-neutral-50"><div className="flex items-start gap-3"><span className="w-10 shrink-0 pt-0.5 text-center text-sm font-semibold tabular-nums text-neutral-500">{item.roll_no}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900">{item.name}</p><p className="truncate text-xs text-neutral-500">{item.title} · {item.scheduled_date}</p></div><span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Result missing</span></div></Link>)}
              {examExceptions.length === 0 && <p className="rounded-xl bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">No result exceptions detected.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
