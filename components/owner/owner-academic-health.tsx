import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Bdi } from "@/components/shared/bdi";
import type {
  AcademicIntelligenceProps,
  DangerRow,
  HealthMetric,
  ReadinessRow,
  StudentRiskRow,
  TeacherComplianceRow,
} from "@/components/examination/academic-intelligence";

function scoreTone(score: number) {
  if (score >= 85) return "success" as const;
  if (score >= 70) return "warning" as const;
  return "danger" as const;
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Metric({ metric }: { metric: HealthMetric }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-500">{metric.label}</p>
        <span className="text-sm font-semibold text-neutral-900">{metric.score}%</span>
      </div>
      <div className="mt-3"><Progress value={metric.score} /></div>
      <p className="mt-2 text-xs leading-5 text-neutral-500">{metric.detail}</p>
    </div>
  );
}

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {href && action ? <Link href={href} className="text-xs font-semibold text-primary-600 hover:text-primary-700">{action}</Link> : null}
    </div>
  );
}

function DangerList({ dangers }: { dangers: DangerRow[] }) {
  if (!dangers.length) return <p className="text-sm text-neutral-500">No active academic danger signals.</p>;
  return <div className="space-y-2">{dangers.slice(0, 5).map((danger, i) => (
    <div key={`${danger.label}-${i}`} className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{danger.label}</p>
        <p className="mt-0.5 text-xs leading-5 text-neutral-500">{danger.detail}</p>
      </div>
      {danger.href ? <Link href={danger.href} className="shrink-0 text-xs font-semibold text-primary-600">Review</Link> : null}
    </div>
  ))}</div>;
}

function Readiness({ rows }: { rows: ReadinessRow[] }) {
  if (!rows.length) return <p className="text-sm text-neutral-500">No examinations scheduled in the next 7 days.</p>;
  return <div className="space-y-2">{rows.slice(0, 6).map(row => (
    <div key={row.id} className="rounded-xl border border-neutral-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{row.title}</Bdi></p>
          <p className="mt-1 truncate text-xs text-neutral-500"><Bdi>{row.className}</Bdi> · <Bdi>{row.subjectName}</Bdi> · <Bdi>{row.date}</Bdi></p>
        </div>
        <Badge variant={scoreTone(row.score)}>{row.score}%</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-neutral-500 sm:grid-cols-6">
        {["Paper", "Approved", "Printed", "Conducted", "Results", "Final"].map((label, i) => {
          const ok = [row.paper, row.approved, row.printed, row.conducted, row.resultsComplete, row.resultsFinalized][i];
          return <span key={label} className={`rounded-lg px-1.5 py-1.5 text-center ${ok ? "bg-green-50 text-green-700" : "bg-neutral-100"}`}>{ok ? "✓" : "○"} {label}</span>;
        })}
      </div>
    </div>
  ))}</div>;
}

function StudentRisks({ rows }: { rows: StudentRiskRow[] }) {
  if (!rows.length) return <p className="text-sm text-neutral-500">No students currently meet the risk threshold.</p>;
  return <div className="space-y-2">{rows.slice(0, 6).map(student => (
    <div key={student.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600">{student.score}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900"><Bdi>{student.name}</Bdi></p>
        <p className="truncate text-xs text-neutral-500"><Bdi>{student.className}</Bdi> · Roll #<Bdi>{student.rollNo}</Bdi> · {student.failed} failed</p>
      </div>
      <span className="text-xs font-semibold text-neutral-500">{student.average == null ? "—" : `${student.average}%`}</span>
    </div>
  ))}</div>;
}

function Teachers({ rows }: { rows: TeacherComplianceRow[] }) {
  if (!rows.length) return <p className="text-sm text-neutral-500">No teacher activity data yet.</p>;
  return <div className="divide-y divide-neutral-100">{rows.slice(0, 6).map(teacher => (
    <div key={teacher.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-neutral-900"><Bdi>{teacher.name}</Bdi></p><p className="text-xs text-neutral-500">{teacher.papers}/{teacher.scheduled} papers · {teacher.results} results</p></div>
      <Badge variant={scoreTone(teacher.score)}>{teacher.score}%</Badge>
    </div>
  ))}</div>;
}

export async function OwnerAcademicHealth({ healthScore, healthMetrics, dailyBrief, dangers, anomalies, readiness, studentRisks, teachers, topicHeatmap, interventionEffectiveness, resultsHref, interventionHref }: Omit<AcademicIntelligenceProps, "roleLabel">) {
  return (
    <main className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Executive academic view</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Academic health</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">A school-wide view of academic performance, exam readiness, student risk and teaching compliance.</p>
        </div>
        <div className="flex gap-2">
          <Link href={interventionHref} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm">Interventions</Link>
          <Link href={resultsHref} className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm">Results pipeline</Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-xs text-neutral-400">Overall academic health</p>
          <div className="mt-2 flex items-end gap-2"><span className="text-4xl font-bold">{healthScore}</span><span className="pb-1 text-sm text-neutral-400">/100</span></div>
          <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-neutral-800"><div className="h-full rounded-full bg-white" style={{ width: `${healthScore}%` }} /></div></div>
          <p className="mt-3 text-xs text-neutral-400">Based on current academic signals.</p>
        </div>
        {healthMetrics.slice(0, 3).map(metric => <Metric key={metric.label} metric={metric} />)}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeader title="Today at a glance" />
        <p className="mb-4 text-sm font-medium text-neutral-800">{dailyBrief.headline}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[[dailyBrief.todayExams, "Exams today"], [dailyBrief.urgentIssues, "Urgent issues"], [dailyBrief.atRiskStudents, "At-risk students"], [dailyBrief.ungradedStudents, "Ungraded"], [dailyBrief.overdueTeachers, "Overdue teachers"]].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-neutral-50 p-3"><p className="text-xl font-bold text-neutral-950">{value}</p><p className="mt-1 text-[11px] text-neutral-500">{label}</p></div>)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><SectionHeader title="Needs attention" action="View interventions" href={interventionHref} /><DangerList dangers={dangers} /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><SectionHeader title="Result anomalies" action="Open results" href={resultsHref} />{anomalies.length ? <div className="space-y-2">{anomalies.slice(0, 5).map((item, i) => <div key={`${item.label}-${i}`} className="rounded-xl bg-neutral-50 p-3"><div className="flex gap-2"><Badge variant={item.severity === "warning" ? "warning" : "danger"}>{item.severity}</Badge><p className="text-sm font-medium text-neutral-900">{item.label}</p></div><p className="mt-1 text-xs leading-5 text-neutral-500">{item.detail}</p></div>)}</div> : <p className="text-sm text-neutral-500">No unusual result patterns detected.</p>}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><SectionHeader title="Exam readiness · next 7 days" action="Open schedule" href="/owner/schedule" /><Readiness rows={readiness} /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><SectionHeader title="Students needing attention" action="Student directory" href="/owner/students" /><StudentRisks rows={studentRisks} /></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><SectionHeader title="Teacher compliance" action="Staff directory" href="/owner/teachers" /><Teachers rows={teachers} /></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"><SectionHeader title="Topic failure hotspots" />{topicHeatmap.length ? <div className="space-y-2">{topicHeatmap.slice(0, 5).map(topic => <div key={topic.topicId} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium text-neutral-900"><Bdi>{topic.name}</Bdi></p><Badge variant={topic.failRate >= 60 ? "danger" : topic.failRate >= 35 ? "warning" : "success"}>{topic.failRate}% fail</Badge></div><p className="mt-1 text-xs text-neutral-500"><Bdi>{topic.subjectName}</Bdi> · {topic.attempts} attempts · {topic.average}% average</p></div>)}</div> : <p className="text-sm text-neutral-500">Topic-level data will appear as assessments accumulate.</p>}</div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeader title="Intervention effectiveness" action="Manage interventions" href={interventionHref} />
        {interventionEffectiveness.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{interventionEffectiveness.slice(0, 6).map(item => <div key={item.id} className="rounded-xl bg-neutral-50 p-3"><p className="truncate text-sm font-medium text-neutral-900"><Bdi>{item.studentName}</Bdi></p><p className="mt-1 truncate text-xs text-neutral-500"><Bdi>{item.action}</Bdi> · follow-up <Bdi>{item.followUpDate}</Bdi></p><div className="mt-2 flex items-center justify-between"><span className="text-xs text-neutral-500">Change</span><Badge variant={item.improvement == null ? "neutral" : item.improvement >= 5 ? "success" : item.improvement > 0 ? "warning" : "danger"}>{item.improvement == null ? "Pending" : `${item.improvement > 0 ? "+" : ""}${item.improvement} pts`}</Badge></div></div>)}</div> : <p className="text-sm text-neutral-500">Complete intervention follow-ups to measure improvement.</p>}
      </section>
    </main>
  );
}
