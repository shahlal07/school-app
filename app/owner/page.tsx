import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getDailyAttendanceReport } from "@/lib/attendance/report";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function Pulse({ label, value, detail, href }: { label: string; value: string; detail: string; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)] transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-neutral-700">{label}</span>
        <span className="text-sm font-bold text-neutral-950">{value}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${clamp(Number.parseFloat(value) || 0)}%` }} />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-neutral-500">{detail}</p>
    </Link>
  );
}

function Metric({ label, value, detail, href }: { label: string; value: string | number; detail: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-1 text-[11px] text-neutral-500">{detail}</p>
    </Link>
  );
}

function SectionHeader({ title, href, label = "View all" }: { title: string; href?: string; label?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold text-neutral-950">{title}</h2>
      {href && <Link href={href} className="shrink-0 text-[11px] font-semibold text-primary-600">{label} →</Link>}
    </div>
  );
}

export default async function OwnerHomePage() {
  await requireRole("owner");
  const supabase = createClient();
  const intelligence = await getAcademicIntelligenceData();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const displayDate = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  const [attendance, students, teachers, classes] = await Promise.all([
    getDailyAttendanceReport(today),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("is_active", true),
    supabase.from("classes").select("id", { count: "exact", head: true })
  ]);

  const total = attendance.rows.reduce((n, r) => n + r.total_students, 0);
  const present = attendance.rows.reduce((n, r) => n + r.present_count, 0);
  const attendancePct = total ? Math.round((present / total) * 100) : null;
  const exam = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("exam"));
  const teacher = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("teacher"));
  const performance = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("performance"));
  const syllabus = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("syllabus"));
  const issueCount = intelligence.dangers.length;
  const urgentCount = intelligence.dailyBrief.urgentIssues;
  const statusText = issueCount === 0 ? "Operating normally" : `${issueCount} item${issueCount === 1 ? "" : "s"} need attention`;

  const issues = intelligence.dangers.slice(0, 4).map((d) => ({
    title: d.label,
    detail: d.detail,
    href: d.href ?? "/owner/alerts",
    severity: d.severity
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary-600">Executive morning brief</p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[27px] font-bold tracking-tight text-neutral-950 sm:text-[31px]">Good morning, Owner.</h1>
            <p className="mt-1 text-sm text-neutral-500">{displayDate}. Here is what matters across the school today.</p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-neutral-400">School status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${issueCount === 0 ? "bg-emerald-500" : "bg-amber-500"}`} />
                <h2 className="text-xl font-bold tracking-tight text-neutral-950">{statusText}</h2>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-5 text-neutral-500">
                {issueCount === 0
                  ? "No active academic or examination signals are currently asking for leadership action."
                  : `${urgentCount > 0 ? `${urgentCount} priority signal${urgentCount === 1 ? "" : "s"} and ` : ""}${issueCount} active school signal${issueCount === 1 ? "" : "s"} are being surfaced for review.`}
              </p>
            </div>
            <Link href="/owner/alerts" className="inline-flex w-fit items-center rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800">
              Review attention →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-4">
            <div><p className="text-[10px] text-neutral-400">Students</p><p className="mt-1 text-lg font-bold">{students.count ?? 0}</p></div>
            <div><p className="text-[10px] text-neutral-400">Teachers</p><p className="mt-1 text-lg font-bold">{teachers.count ?? 0}</p></div>
            <div><p className="text-[10px] text-neutral-400">Classes</p><p className="mt-1 text-lg font-bold">{classes.count ?? 0}</p></div>
            <div><p className="text-[10px] text-neutral-400">Attendance</p><p className="mt-1 text-lg font-bold">{attendancePct == null ? "—" : `${attendancePct}%`}</p></div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="What needs you?" href="/owner/alerts" />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {issues.length ? issues.map((issue, index) => (
            <Link href={issue.href} key={`${issue.title}-${index}`} className="flex items-start gap-3 border-b border-neutral-100 px-4 py-3.5 last:border-0 hover:bg-neutral-50 sm:px-5">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${issue.severity === "critical" || issue.severity === "urgent" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>!</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900">{issue.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{issue.detail}</span>
              </span>
              <span className="mt-2 text-neutral-300">→</span>
            </Link>
          )) : (
            <div className="p-5 text-center text-sm text-neutral-500">Nothing needs your attention right now.</div>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="School pulse" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Pulse label="Academic" value={`${performance?.score ?? intelligence.healthScore}%`} detail="Current student performance signal" href="/owner/academic-health" />
          <Pulse label="Attendance" value={attendancePct == null ? "0%" : `${attendancePct}%`} detail={`${present} of ${total} students marked present today`} href="/owner/attendance" />
          <Pulse label="Examinations" value={`${exam?.score ?? 0}%`} detail={exam?.detail ?? "Current examination readiness"} href="/owner/schedule" />
          <Pulse label="Staff" value={`${teacher?.score ?? 0}%`} detail={teacher?.detail ?? "Teaching compliance signal"} href="/owner/teachers" />
        </div>
      </section>

      <section>
        <SectionHeader title="Today at school" href="/owner/attendance" />
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="relative ml-2 border-l border-neutral-200 pl-6">
            <div className="relative pb-5">
              <span className="absolute -left-[31px] top-0 h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-white" />
              <p className="text-xs font-semibold text-neutral-900">Student attendance</p>
              <p className="mt-1 text-xs text-neutral-500">{total ? `${present} of ${total} students are marked present today.` : "No student attendance has been recorded yet today."}</p>
            </div>
            <div className="relative pb-5">
              <span className="absolute -left-[31px] top-0 h-2.5 w-2.5 rounded-full bg-neutral-300 ring-4 ring-white" />
              <p className="text-xs font-semibold text-neutral-900">Assessments today</p>
              <p className="mt-1 text-xs text-neutral-500">{intelligence.dailyBrief.todayExams} scheduled assessment{intelligence.dailyBrief.todayExams === 1 ? "" : "s"} today.</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[31px] top-0 h-2.5 w-2.5 rounded-full bg-neutral-300 ring-4 ring-white" />
              <p className="text-xs font-semibold text-neutral-900">Academic follow-through</p>
              <p className="mt-1 text-xs text-neutral-500">
                {intelligence.dailyBrief.ungradedStudents > 0 ? `${intelligence.dailyBrief.ungradedStudents} student result${intelligence.dailyBrief.ungradedStudents === 1 ? "" : "s"} still need grading.` : "No ungraded student results are currently flagged for today."}
                {intelligence.dailyBrief.overdueTeachers > 0 ? ` ${intelligence.dailyBrief.overdueTeachers} teacher${intelligence.dailyBrief.overdueTeachers === 1 ? "" : "s"} have overdue tests.` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="School at a glance" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric label="Active students" value={students.count ?? 0} detail="Student directory" href="/owner/students" />
          <Metric label="Active teachers" value={teachers.count ?? 0} detail="Staff directory" href="/owner/teachers" />
          <Metric label="Classes" value={classes.count ?? 0} detail="School-wide roster" href="/owner/students" />
          <Metric label="Syllabus" value={`${syllabus?.score ?? 0}%`} detail="Current coverage signal" href="/owner/academic-health" />
        </div>
      </section>

      <section className="pb-3">
        <SectionHeader title="Go to" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ["Academic", "/owner/academic-health", "Health & risks"],
            ["Attendance", "/owner/attendance", "Daily overview"],
            ["Examinations", "/owner/schedule", "Readiness & schedule"],
            ["Reports", "/owner/reports", "Executive reports"]
          ].map(([label, href, detail]) => (
            <Link key={href} href={href} className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-primary-200 hover:shadow-sm">
              <p className="text-sm font-semibold text-neutral-900">{label}</p>
              <p className="mt-1 text-[11px] text-neutral-500">{detail}</p>
              <p className="mt-3 text-[11px] font-semibold text-primary-600">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
