import Link from "next/link";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getDailyAttendanceReport } from "@/lib/attendance/report";
import { Bdi } from "@/components/shared/bdi";

function percentage(present: number, total: number): number | null {
  return total > 0 ? Math.round((present / total) * 1000) / 10 : null;
}

function StatCard({ label, value, detail, href, tone = "neutral" }: { label: string; value: string | number; detail: string; href: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const toneClass = { neutral: "border-neutral-200 bg-white", good: "border-emerald-100 bg-emerald-50/60", warn: "border-amber-100 bg-amber-50/60", bad: "border-red-100 bg-red-50/60" }[tone];
  return <Link href={href} className={`block rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)] transition-transform active:scale-[.99] ${toneClass}`}><p className="text-[11px] font-medium text-neutral-500">{label}</p><p className="mt-1 text-[25px] font-bold tracking-tight text-neutral-950">{value}</p><p className="mt-0.5 text-[11px] text-neutral-500">{detail}</p></Link>;
}

function Section({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="mt-7"><div className="mb-2.5 flex items-center justify-between gap-3"><h2 className="text-[14px] font-bold text-neutral-950">{title}</h2>{action && <Link href={action} className="text-[11px] font-semibold text-primary-600">View all →</Link>}</div>{children}</section>;
}

function Empty({ children = "No issues detected right now." }: { children?: string }) {
  return <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-5 text-center text-sm text-neutral-500">{children}</div>;
}

export default async function OwnerHomePage() {
  await requireRole("owner");
  const supabase = createClient();
  const intelligence = await getAcademicIntelligenceData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [attendanceRes, completedSetsRes, activeStudentsRes, activeTeachersRes] = await Promise.all([
    getDailyAttendanceReport(today),
    supabase.from("exam_sets").select("id,set_number,completed_on").eq("status", "completed").order("completed_on", { ascending: false }).limit(4),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("is_active", true)
  ]);

  const attendanceTotal = attendanceRes.rows.reduce((n, r) => n + r.total_students, 0);
  const attendancePresent = attendanceRes.rows.reduce((n, r) => n + r.present_count, 0);
  const attendancePct = percentage(attendancePresent, attendanceTotal);
  const examMetric = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("exam"));
  const teacherMetric = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("teacher"));
  const syllabusMetric = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("syllabus"));
  const completedSets = (completedSetsRes.data ?? []) as { id: string; set_number: number; completed_on: string | null }[];

  const attentionItems = [
    ...intelligence.dangers.slice(0, 3).map((danger) => ({ title: danger.label, detail: danger.detail, href: danger.href, severity: danger.severity })),
    ...(intelligence.studentRisks.length ? [{ title: `${intelligence.studentRisks.length} students need attention`, detail: "Repeated academic weakness detected across recent assessments.", href: "/owner/performance", severity: "critical" }] : [])
  ].slice(0, 4);

  const topTeachers = intelligence.teachers.slice(0, 4);
  const trendPoints = completedSets.length ? completedSets.map(() => intelligence.healthScore).slice().reverse() : [intelligence.healthScore];
  const max = Math.max(...trendPoints, 1);
  const min = Math.min(...trendPoints, 0);
  const range = Math.max(max - min, 1);
  const coords = trendPoints.map((p, i) => `${(i / Math.max(trendPoints.length - 1, 1)) * 100},${100 - ((p - min) / range) * 76 - 12}`).join(" ");

  return <main className="mx-auto w-full max-w-6xl">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary-600">Executive command center</p><h1 className="mt-1 text-[26px] font-bold tracking-tight text-neutral-950 sm:text-[30px]">School overview</h1><p className="mt-1 max-w-xl text-sm leading-5 text-neutral-500">A clear view of school health, today's attendance and the things that need your attention.</p></div>
      <p className="mt-2 text-[11px] font-medium text-neutral-400 sm:mt-0">Today · {today}</p>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <StatCard label="Academic health" value={`${intelligence.healthScore}%`} detail="overall school health" href="/owner/academic-health" tone={intelligence.healthScore >= 70 ? "good" : intelligence.healthScore >= 50 ? "warn" : "bad"}/>
      <StatCard label="Student attendance" value={attendancePct == null ? "—" : `${attendancePct}%`} detail={`${attendanceTotal} students today`} href="/owner/attendance" tone={attendancePct == null ? "neutral" : attendancePct >= 90 ? "good" : "warn"}/>
      <StatCard label="Exam readiness" value={examMetric?.score == null ? "—" : `${examMetric.score}%`} detail="next 7 days" href="/owner/schedule" tone={(examMetric?.score ?? 0) >= 80 ? "good" : "warn"}/>
      <StatCard label="Teacher compliance" value={teacherMetric?.score == null ? "—" : `${teacherMetric.score}%`} detail="papers · tests · results" href="/owner/teachers" tone={(teacherMetric?.score ?? 0) >= 90 ? "good" : "warn"}/>
    </div>

    <Section title="Needs attention" action="/owner/alerts">
      {attentionItems.length ? <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,.03)]">{attentionItems.map((item, i) => <Link href={item.href} key={`${item.title}-${i}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.severity === "critical" || item.severity === "urgent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}><span className="text-sm font-bold">!</span></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-neutral-900">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-neutral-500">{item.detail}</span></span><span className="mt-2 text-neutral-300">→</span></Link>)}</div> : <Empty/>}
    </Section>

    <div className="grid gap-5 lg:grid-cols-[1.35fr_.9fr]">
      <Section title="School health trend" action="/owner/performance">
        <Link href="/owner/performance" className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="flex items-start justify-between"><div><p className="text-[11px] text-neutral-500">Academic health score</p><p className="mt-1 text-xl font-bold">{intelligence.healthScore}<span className="ml-1 text-xs font-medium text-neutral-400">/ 100</span></p></div><span className="rounded-full bg-neutral-50 px-2 py-1 text-[10px] font-semibold text-neutral-500">Recent</span></div><div className="mt-4 h-36"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full"><path d="M0 88H100M0 50H100M0 12H100" stroke="#eef2f4" strokeWidth="1" fill="none"/><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500" vectorEffect="non-scaling-stroke"/></svg></div><div className="flex justify-between text-[10px] text-neutral-400"><span>Earlier</span><span>Now</span></div></Link>
      </Section>

      <Section title="Attendance today" action="/owner/attendance">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="flex items-center justify-between"><div><p className="text-3xl font-bold tracking-tight">{attendancePct == null ? "—" : `${attendancePct}%`}</p><p className="mt-1 text-xs text-neutral-500">{attendancePresent} of {attendanceTotal} students present</p></div><div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-primary-100 bg-primary-50 text-sm font-bold text-primary-700">{attendancePct == null ? "—" : attendancePct}</div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-sm font-bold text-emerald-700">{attendancePresent}</p><p className="text-[10px] text-emerald-700/70">Present</p></div><div className="rounded-xl bg-red-50 p-2.5"><p className="text-sm font-bold text-red-700">{Math.max(attendanceTotal - attendancePresent, 0)}</p><p className="text-[10px] text-red-700/70">Not present</p></div><div className="rounded-xl bg-neutral-50 p-2.5"><p className="text-sm font-bold text-neutral-700">{attendanceTotal}</p><p className="text-[10px] text-neutral-500">Total</p></div></div></div>
      </Section>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Examination status" action="/owner/schedule">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="grid grid-cols-2 gap-2.5"><div className="rounded-xl bg-neutral-50 p-3"><p className="text-lg font-bold">{examMetric?.score == null ? "—" : `${examMetric.score}%`}</p><p className="text-[10px] text-neutral-500">Readiness</p></div><div className="rounded-xl bg-neutral-50 p-3"><p className="text-lg font-bold">{completedSets.length}</p><p className="text-[10px] text-neutral-500">Recent completed</p></div></div><div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3"><span className="text-xs text-neutral-500">Latest finalized exam sets</span><span className="text-xs font-semibold text-primary-600">Open exams →</span></div></div>
      </Section>

      <Section title="School progress">
        <div className="grid gap-2.5 sm:grid-cols-2"><Link href="/owner/syllabus" className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Syllabus coverage</p><span className="text-sm font-bold">{syllabusMetric?.score ?? 0}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(0, Math.min(100, syllabusMetric?.score ?? 0))}%` }}/></div><p className="mt-2 text-[10px] text-neutral-500">Across active subjects</p></Link><Link href="/owner/results" className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]"><p className="text-sm font-semibold">Completed exam sets</p><p className="mt-2 text-2xl font-bold">{completedSets.length}</p><p className="mt-1 text-[10px] text-neutral-500">Finalized in the current record</p></Link></div>
      </Section>
    </div>

    <Section title="People at a glance">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Link href="/owner/students" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[11px] text-neutral-500">Active students</p><p className="mt-1 text-2xl font-bold">{activeStudentsRes.count ?? 0}</p></Link><Link href="/owner/teachers" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[11px] text-neutral-500">Active teachers</p><p className="mt-1 text-2xl font-bold">{activeTeachersRes.count ?? 0}</p></Link><Link href="/owner/students" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[11px] text-neutral-500">Student directory</p><p className="mt-3 text-xs font-semibold text-primary-600">Open directory →</p></Link><Link href="/owner/teachers" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[11px] text-neutral-500">Staff directory</p><p className="mt-3 text-xs font-semibold text-primary-600">Open directory →</p></Link></div>
    </Section>

    <Section title="Teacher outcomes" action="/owner/teachers">
      {topTeachers.length ? <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,.03)]"><div className="grid grid-cols-[1fr_auto_auto] border-b border-neutral-100 bg-neutral-50/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400"><span>Teacher</span><span>Compliance</span><span>Pass rate</span></div>{topTeachers.map((teacher) => <Link href="/owner/teachers" key={teacher.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-neutral-100 px-4 py-3 last:border-0"><Bdi><span className="text-sm font-semibold text-neutral-900">{teacher.name}</span></Bdi><span className="text-xs font-semibold text-neutral-600">{teacher.score}%</span><span className="text-xs text-neutral-500">{teacher.outcomePassRate == null ? "—" : `${teacher.outcomePassRate}%`}</span></Link>)}</div> : <Empty>Teacher outcome data is not available yet.</Empty>}
    </Section>

    <Section title="Quick access">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Link href="/owner/performance" className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold">Academic analytics<span className="mt-1 block text-[10px] font-normal text-neutral-500">School performance →</span></Link><Link href="/owner/reports" className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold">Reports<span className="mt-1 block text-[10px] font-normal text-neutral-500">Executive reporting →</span></Link><Link href="/owner/students" className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold">Students<span className="mt-1 block text-[10px] font-normal text-neutral-500">Directory & profiles →</span></Link><Link href="/owner/schedule" className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold">Examinations<span className="mt-1 block text-[10px] font-normal text-neutral-500">Schedule & status →</span></Link></div>
    </Section>
  </main>;
}
