import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getDailyAttendanceReport } from "@/lib/attendance/report";

function Card({ label, value, detail, href }: { label: string; value: string | number; detail: string; href: string }) {
  return <Link href={href} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)] transition hover:border-primary-200 hover:shadow-sm"><p className="text-[11px] font-medium text-neutral-500">{label}</p><p className="mt-1 text-[26px] font-bold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-neutral-500">{detail}</p></Link>;
}
function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return <section className="mt-7"><div className="mb-2.5 flex items-center justify-between"><h2 className="text-sm font-bold">{title}</h2>{href && <Link href={href} className="text-[11px] font-semibold text-primary-600">View all →</Link>}</div>{children}</section>;
}

export default async function OwnerHomePage() {
  await requireRole("owner");
  const supabase = createClient();
  const intelligence = await getAcademicIntelligenceData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [attendance, students, teachers] = await Promise.all([
    getDailyAttendanceReport(today),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("is_active", true)
  ]);
  const total = attendance.rows.reduce((n, r) => n + r.total_students, 0);
  const present = attendance.rows.reduce((n, r) => n + r.present_count, 0);
  const attendancePct = total ? Math.round((present / total) * 1000) / 10 : null;
  const exam = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("exam"));
  const teacher = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("teacher"));
  const syllabus = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("syllabus"));
  const issues = intelligence.dangers.slice(0, 4).map((d) => ({ title: d.label, detail: d.detail, href: d.href ?? "/owner/alerts", severity: d.severity }));
  if (intelligence.studentRisks.length && issues.length < 4) issues.push({ title: `${intelligence.studentRisks.length} students need attention`, detail: "Repeated academic weakness detected.", href: "/owner/performance", severity: "critical" });

  return <main className="mx-auto w-full max-w-6xl">
    <header><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary-600">Executive command center</p><div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-[26px] font-bold tracking-tight sm:text-[30px]">School overview</h1><p className="mt-1 text-sm leading-5 text-neutral-500">School-wide health, attendance and the issues that need your attention.</p></div><p className="text-[11px] font-medium text-neutral-400">Today · {today}</p></div></header>
    <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Card label="Academic health" value={`${intelligence.healthScore}%`} detail="Overall school health" href="/owner/academic-health" />
      <Card label="Student attendance" value={attendancePct == null ? "—" : `${attendancePct}%`} detail={`${total} students today`} href="/owner/attendance" />
      <Card label="Exam readiness" value={exam?.score == null ? "—" : `${exam.score}%`} detail="Current readiness" href="/owner/schedule" />
      <Card label="Teacher compliance" value={teacher?.score == null ? "—" : `${teacher.score}%`} detail="Papers · tests · results" href="/owner/teachers" />
    </div>
    <Section title="Needs attention" href="/owner/alerts"><div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">{issues.length ? issues.map((issue, i) => <Link href={issue.href} key={`${issue.title}-${i}`} className="flex items-start gap-3 border-b border-neutral-100 px-4 py-3.5 last:border-0 hover:bg-neutral-50"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${issue.severity === "critical" || issue.severity === "urgent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>!</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{issue.title}</span><span className="mt-0.5 block text-xs leading-5 text-neutral-500">{issue.detail}</span></span><span className="mt-2 text-neutral-300">→</span></Link>) : <div className="p-5 text-center text-sm text-neutral-500">No issues detected right now.</div>}</div></Section>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.9fr]">
      <Section title="Academic health" href="/owner/performance"><Link href="/owner/performance" className="block rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-start justify-between"><div><p className="text-[11px] text-neutral-500">Current school health score</p><p className="mt-1 text-3xl font-bold">{intelligence.healthScore}<span className="ml-1 text-xs font-medium text-neutral-400">/ 100</span></p></div><span className="rounded-full bg-neutral-50 px-2 py-1 text-[10px] text-neutral-500">Live data</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(0, Math.min(100, intelligence.healthScore))}%` }}/></div><p className="mt-2 text-[10px] text-neutral-500">Open academic analytics for class and subject detail.</p></Link></Section>
      <Section title="Attendance today" href="/owner/attendance"><div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-3xl font-bold">{attendancePct == null ? "—" : `${attendancePct}%`}</p><p className="mt-1 text-xs text-neutral-500">{present} of {total} students present</p><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-2"><b className="text-sm text-emerald-700">{present}</b><p className="text-[10px] text-emerald-700/70">Present</p></div><div className="rounded-xl bg-red-50 p-2"><b className="text-sm text-red-700">{Math.max(total - present, 0)}</b><p className="text-[10px] text-red-700/70">Not present</p></div><div className="rounded-xl bg-neutral-50 p-2"><b className="text-sm">{total}</b><p className="text-[10px] text-neutral-500">Total</p></div></div></div></Section>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Examination status" href="/owner/schedule"><div className="grid grid-cols-2 gap-2.5"><div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[11px] text-neutral-500">Readiness</p><p className="mt-1 text-2xl font-bold">{exam?.score == null ? "—" : `${exam.score}%`}</p></div><Link href="/owner/results" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[11px] text-neutral-500">Results</p><p className="mt-1 text-sm font-semibold text-primary-600">Open results →</p></Link></div></Section>
      <Section title="School progress"><div className="grid grid-cols-2 gap-2.5"><Link href="/owner/syllabus" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-sm font-semibold">Syllabus coverage</p><p className="mt-2 text-2xl font-bold">{syllabus?.score ?? 0}%</p><div className="mt-3 h-2 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(0, Math.min(100, syllabus?.score ?? 0))}%` }}/></div></Link><Link href="/owner/students" className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-sm font-semibold">Active students</p><p className="mt-2 text-2xl font-bold">{students.count ?? 0}</p><p className="mt-1 text-[10px] text-neutral-500">Student directory →</p></Link></div></Section>
    </div>
    <Section title="People at a glance"><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"><Card label="Active students" value={students.count ?? 0} detail="Student directory" href="/owner/students"/><Card label="Active teachers" value={teachers.count ?? 0} detail="Staff directory" href="/owner/teachers"/><Card label="Reports" value="Open" detail="Executive reporting" href="/owner/reports"/><Card label="Messages" value="Open" detail="Staff communication" href="/owner/messages"/></div></Section>
    <Section title="Quick access"><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[["Academic analytics","/owner/performance"],["Reports","/owner/reports"],["Students","/owner/students"],["Examinations","/owner/schedule"]].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold hover:border-primary-200">{label}<span className="mt-1 block text-[10px] font-normal text-neutral-500">Open →</span></Link>)}</div></Section>
  </main>;
}
