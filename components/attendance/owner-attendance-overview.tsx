import Link from "next/link";
import type { DailyAttendanceReportRow, AttendanceAcademicSignal, ExamAttendanceReconciliationRow } from "@/types/attendance";
import type { StaffAttendanceSummaryRow } from "@/components/attendance/staff-attendance-summary";
import type { TeacherAttendanceComplianceRow } from "@/lib/attendance/teacher-compliance";
import { Bdi } from "@/components/shared/bdi";

interface TrendRow {
  attendance_date: string;
  attendance_percentage: number;
  total_students: number;
  absent_count: number;
}

function tone(value: number) {
  if (value >= 90) return "text-emerald-700 bg-emerald-50";
  if (value >= 80) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function statusLabel(status: string | null) {
  if (!status) return "Not marked";
  return status === "present" ? "Present" : status === "absent" ? "Absent" : status === "late" ? "Late" : status === "leave" ? "Leave" : "Excused";
}

export function OwnerAttendanceOverview({
  rows,
  missing,
  staff,
  signals,
  exceptions,
  trend,
  teacherCompliance,
  date,
}: {
  rows: DailyAttendanceReportRow[];
  missing: { className: string; sectionName: string; teacherName: string }[];
  staff: StaffAttendanceSummaryRow[];
  signals: AttendanceAcademicSignal[];
  exceptions: ExamAttendanceReconciliationRow[];
  trend: TrendRow[];
  teacherCompliance: TeacherAttendanceComplianceRow[];
  date: string;
}) {
  const total = rows.reduce((n, r) => n + r.total_students, 0);
  const present = rows.reduce((n, r) => n + r.present_count, 0);
  const absent = rows.reduce((n, r) => n + r.absent_count, 0);
  const late = rows.reduce((n, r) => n + r.late_count, 0);
  const rate = total ? Math.round((present / total) * 1000) / 10 : 0;
  const submitted = rows.filter((r) => r.session_status === "submitted").length;
  const submissionRate = rows.length ? Math.round((submitted / rows.length) * 100) : 0;
  const staffPresent = staff.filter((r) => ["present", "late", "excused"].includes(r.status ?? "")).length;
  const staffAbsent = staff.filter((r) => ["absent", "leave"].includes(r.status ?? "")).length;
  const staffMissing = staff.length - staffPresent - staffAbsent;
  const teachersAttention = teacherCompliance.filter((r) => r.compliance_percentage < 90).slice(0, 5);
  const classAttention = [...rows].sort((a, b) => a.attendance_percentage - b.attendance_percentage).slice(0, 5);
  const maxTrend = Math.max(100, ...trend.map((r) => r.attendance_percentage));

  return (
    <main className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Owner · Attendance</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">Attendance command center</h1>
          <p className="mt-1 text-sm text-neutral-500">School-wide attendance health, reporting discipline and intervention signals · <Bdi>{date}</Bdi></p>
        </div>
        <Link href="/owner/students" className="inline-flex w-fit items-center rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50">Open student directory →</Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Student attendance</p><div className="mt-2 flex items-end justify-between gap-2"><p className="text-3xl font-semibold tabular-nums text-neutral-950">{rate}%</p><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${tone(rate)}`}>{rate >= 90 ? "Healthy" : rate >= 80 ? "Watch" : "Critical"}</span></div><p className="mt-2 text-xs text-neutral-500"><Bdi>{present}</Bdi> present · <Bdi>{absent}</Bdi> absent · <Bdi>{late}</Bdi> late</p></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Register completion</p><p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{submissionRate}%</p><p className="mt-2 text-xs text-neutral-500"><Bdi>{submitted}</Bdi> of <Bdi>{rows.length}</Bdi> class registers submitted</p></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Attention signals</p><p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{signals.length}</p><p className="mt-2 text-xs text-neutral-500">Students combining attendance or academic risk</p></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Exam exceptions</p><p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{exceptions.length}</p><p className="mt-2 text-xs text-neutral-500">Present in exam but missing a result</p></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">School trend</p><h2 className="mt-1 text-lg font-semibold text-neutral-950">14-day attendance</h2></div><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">{trend.length} days</span></div>
          {trend.length ? <div className="mt-5 overflow-x-auto"><div className="flex h-48 min-w-[520px] items-end gap-2 rounded-xl bg-neutral-50 px-3 py-4">{trend.map((item) => <div key={item.attendance_date} className="flex h-full min-w-6 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-semibold tabular-nums text-neutral-500">{item.attendance_percentage}%</span><div className="w-full max-w-9 rounded-t-md bg-primary-500" style={{ height: `${Math.max(8, (item.attendance_percentage / maxTrend) * 120)}px` }} /><span className="text-[9px] tabular-nums text-neutral-400">{item.attendance_date.slice(5)}</span></div>)}</div></div> : <div className="mt-5 rounded-xl bg-neutral-50 p-8 text-center text-sm text-neutral-500">No submitted attendance days yet.</div>}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Today</p><h2 className="mt-1 text-lg font-semibold text-neutral-950">Where attention is needed</h2></div>
          <div className="mt-4 space-y-3">{classAttention.map((row) => <div key={row.session_id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{row.class_name}</Bdi> · <Bdi>{row.section_name}</Bdi></p><p className="text-xs text-neutral-500">{row.absent_count} absent · {row.late_count} late</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${tone(row.attendance_percentage)}`}>{row.attendance_percentage}%</span></div>)}{classAttention.length === 0 && <p className="rounded-xl bg-neutral-50 p-5 text-center text-sm text-neutral-500">No class registers submitted.</p>}</div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="border-b border-neutral-100 p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Reporting discipline</p><h2 className="mt-1 text-lg font-semibold text-neutral-950">Class registers</h2></div><div className="p-4 sm:p-5">{missing.length ? <div className="space-y-2">{missing.slice(0, 6).map((item) => <div key={`${item.className}-${item.sectionName}`} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"><p className="text-sm font-semibold text-neutral-900"><Bdi>{item.className}</Bdi> · <Bdi>{item.sectionName}</Bdi></p><p className="mt-1 text-xs text-neutral-600">No register submitted · <Bdi>{item.teacherName}</Bdi></p></div>)}</div> : <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">All class registers are submitted.</div>}</div></div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="border-b border-neutral-100 p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Academic crossover</p><h2 className="mt-1 text-lg font-semibold text-neutral-950">Students to watch</h2></div><div className="divide-y divide-neutral-100">{signals.slice(0, 6).map((student) => <div key={student.student_id} className="p-4"><div className="flex items-start gap-3"><span className="w-9 shrink-0 pt-0.5 text-center text-xs font-bold text-neutral-400"><Bdi>{student.roll_no}</Bdi></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{student.name}</Bdi></p><p className="mt-1 text-xs text-neutral-500">Attendance {student.attendance_percentage ?? "—"}% · Assessment {student.assessment_percentage ?? "—"}%</p></div><span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">Review</span></div></div>)}{signals.length === 0 && <p className="p-5 text-center text-sm text-neutral-500">No attendance/academic risk signals.</p>}</div></div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="border-b border-neutral-100 p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Staff attendance</p><h2 className="mt-1 text-lg font-semibold text-neutral-950">Today at a glance</h2></div><div className="p-4 sm:p-5"><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-xl font-bold tabular-nums text-emerald-700">{staffPresent}</p><p className="text-[11px] font-medium text-emerald-800">Present</p></div><div className="rounded-xl bg-red-50 p-3 text-center"><p className="text-xl font-bold tabular-nums text-red-700">{staffAbsent}</p><p className="text-[11px] font-medium text-red-800">Absent/leave</p></div><div className="rounded-xl bg-amber-50 p-3 text-center"><p className="text-xl font-bold tabular-nums text-amber-700">{staffMissing}</p><p className="text-[11px] font-medium text-amber-800">Not marked</p></div></div><div className="mt-4 space-y-2">{teachersAttention.map((teacher) => <div key={teacher.teacher_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3"><p className="truncate text-sm font-medium text-neutral-800"><Bdi>{teacher.teacher_name}</Bdi></p><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold tabular-nums text-amber-700">{teacher.compliance_percentage}%</span></div>)}{teachersAttention.length === 0 && <p className="text-sm text-neutral-500">Teacher attendance submission is on track.</p>}</div></div></div>
      </section>

      {exceptions.length > 0 && <section className="rounded-2xl border border-red-200 bg-red-50/60 shadow-sm"><div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-red-700">Examination integrity</p><h2 className="mt-1 text-lg font-semibold text-red-950">Attendance/result mismatches need review</h2><p className="mt-1 text-sm text-red-800">{exceptions.length} student result record(s) are missing after an exam attendance record marked the student present.</p></div><Link href="/owner/schedule" className="w-fit rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-red-800 shadow-sm ring-1 ring-red-200">Review examinations →</Link></div></section>}

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="border-b border-neutral-100 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Decision support</p><h2 className="mt-1 text-lg font-semibold text-neutral-950">Attendance is an operating signal</h2></div><Link href="/owner/reports" className="text-xs font-semibold text-primary-600">Open reports →</Link></div></div><div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5"><div className="rounded-xl bg-neutral-50 p-4"><p className="text-sm font-semibold text-neutral-900">Low attendance</p><p className="mt-1 text-xs leading-5 text-neutral-500">Use the class and student signals above to identify where absence is affecting academic outcomes.</p></div><div className="rounded-xl bg-neutral-50 p-4"><p className="text-sm font-semibold text-neutral-900">Submission gaps</p><p className="mt-1 text-xs leading-5 text-neutral-500">Unsubmitted registers are operational gaps, not zero attendance. They stay visible until corrected.</p></div><div className="rounded-xl bg-neutral-50 p-4"><p className="text-sm font-semibold text-neutral-900">Leadership action</p><p className="mt-1 text-xs leading-5 text-neutral-500">Owner sees the signal; class teachers, Clerk and Coordinator own the daily attendance workflow.</p></div></div></section>
    </main>
  );
}
