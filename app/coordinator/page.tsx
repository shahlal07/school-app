import Link from "next/link";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getAttendanceAcademicSignals } from "@/lib/attendance/integration";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";
import {
  DashboardList,
  DashboardSection,
  DashboardShell,
  MiniTable,
  ProgressCard,
  type DashboardItem
} from "@/components/shared/role-dashboard";

export default async function CoordinatorDashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const t = await getT();
  const intelligence = await getAcademicIntelligenceData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [scheduleRes, papersRes, submissionsRes, activeSetRes, attendanceSignals] = await Promise.all([
    supabase.from("schedule_items").select("id,title,class_id,subject_id,status,scheduled_date,teacher_id").gte("scheduled_date", today).order("scheduled_date").limit(50),
    supabase.from("exam_papers").select("id,schedule_item_id,status,print_status"),
    supabase.from("result_submissions").select("status"),
    supabase.from("exam_sets").select("id,class_id,set_number,status").in("status", ["active", "planned", "awaiting_completion"]).order("set_number", { ascending: false }).limit(1),
    getAttendanceAcademicSignals(50)
  ]);

  const schedule = (scheduleRes.data ?? []) as { id: string; title: string; class_id: string; subject_id: string; status: string; scheduled_date: string; teacher_id: string | null }[];
  const papers = (papersRes.data ?? []) as { id: string; schedule_item_id: string; status: string; print_status: string | null }[];
  const submissions = (submissionsRes.data ?? []) as { status: string }[];
  const activeSet = (activeSetRes.data?.[0] ?? null) as { id: string; class_id: string; set_number: number; status: string } | null;
  const paperBySchedule = new Map(papers.map((p) => [p.schedule_item_id, p]));
  const upcoming = schedule.slice(0, 5);
  const pendingResults = submissions.filter((r) => r.status === "submitted").length;
  const papersPending = schedule.filter((s) => !paperBySchedule.has(s.id) || ["draft", "submitted", "under_review"].includes(paperBySchedule.get(s.id)?.status ?? "")).length;
  const compliance = intelligence.teachers.length ? Math.round(intelligence.teachers.reduce((sum, t) => sum + t.score, 0) / intelligence.teachers.length) : 0;
  const attendanceAttention = attendanceSignals.rows.filter((r) => r.signal !== "normal").length;

  const alerts: DashboardItem[] = [
    ...intelligence.dangers.slice(0, 3).map((d) => ({ title: d.label, detail: d.detail, href: d.href ?? "/coordinator/alerts", tone: d.severity === "critical" || d.severity === "urgent" ? "danger" as const : "warning" as const, badge: d.severity, icon: "alert" })),
    ...(attendanceAttention ? [{ title: `${attendanceAttention} attendance/academic signals need review`, detail: "Attendance is being compared with assessment outcomes.", href: "/coordinator/attendance", tone: "warning" as const, badge: "Attendance", icon: "users" }] : []),
    ...(intelligence.studentRisks.length ? [{ title: `${intelligence.studentRisks.length} students need intervention review`, detail: "Use the risk list to assign targeted academic support.", href: "/coordinator/interventions", tone: "danger" as const, badge: "Action", icon: "target" }] : [])
  ].slice(0, 5);

  const examRows = upcoming.map((item) => [
    <Bdi key="title">{item.title}</Bdi>,
    item.scheduled_date === today ? "Today" : item.scheduled_date,
    item.status.replaceAll("_", " ")
  ]);

  return (
    <DashboardShell
      eyebrow="School OS · Academic Operations"
      title="Coordinator workspace"
      subtitle="Control examinations, results, interventions, coverage, and teacher compliance."
      metrics={[
        { label: "Exams in progress", value: schedule.length, detail: "upcoming pipeline", tone: "info", href: "/coordinator/schedule" },
        { label: "Results pending", value: pendingResults, detail: "submitted for review", tone: pendingResults ? "warning" : "success", href: "/coordinator/results" },
        { label: "Interventions", value: intelligence.studentRisks.length, detail: "students needing review", tone: intelligence.studentRisks.length ? "danger" : "success", href: "/coordinator/interventions" },
        { label: "Compliance", value: `${compliance}%`, detail: "teacher workflow", tone: compliance >= 90 ? "success" : "warning", href: "/coordinator/academic-health" }
      ]}
      quickActions={[
        { label: "Exam sets", href: "/coordinator/exam-sets", icon: "calendar", primary: true },
        { label: "Results", href: "/coordinator/results", icon: "check" },
        { label: "Interventions", href: "/coordinator/interventions", icon: "target" },
        { label: "Attendance", href: "/coordinator/attendance", icon: "users" }
      ]}
      accent="violet"
    >
      <DashboardSection title="Current exam set" action={{ label: "Manage sets", href: "/coordinator/exam-sets" }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProgressCard title={activeSet ? `Set #${activeSet.set_number}` : "No active set"} value={activeSet ? 38 : 0} detail={activeSet ? `Class cycle · ${activeSet.status.replaceAll("_", " ")}` : "Generate the next class exam set"} href="/coordinator/exam-sets" tone={activeSet ? "info" : "neutral"} />
          <ProgressCard title="Paper pipeline" value={papersPending ? 100 - Math.min(100, papersPending * 10) : 100} detail={`${papersPending} upcoming assessments need paper action`} href="/coordinator/papers" tone={papersPending ? "warning" : "success"} />
        </div>
      </DashboardSection>

      <DashboardSection title="Recent alerts" action={{ label: "View all", href: "/coordinator/alerts" }}>
        <DashboardList items={alerts} />
      </DashboardSection>

      <DashboardSection title="Upcoming examination control" action={{ label: "Open schedule", href: "/coordinator/schedule" }}>
        {examRows.length ? <MiniTable headers={["Assessment", "Date", "Status"]} rows={examRows} href="/coordinator/schedule" /> : <DashboardList items={[]} />}
      </DashboardSection>

      <DashboardSection title="Academic intelligence">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProgressCard title="Academic health" value={intelligence.healthScore} detail="School-wide academic state" href="/coordinator/academic-health" tone={intelligence.healthScore >= 70 ? "success" : "warning"} />
          <ProgressCard title="Teacher compliance" value={compliance} detail="Paper · test · result completion" href="/coordinator/academic-health" tone={compliance >= 90 ? "success" : "warning"} />
        </div>
      </DashboardSection>

      <DashboardSection title="Coordinator actions">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            ["Calendar & working days", "/coordinator/calendar"],
            ["Syllabus coverage", "/coordinator/syllabus"],
            ["Performance", "/coordinator/performance"],
            ["Student records", "/coordinator/students"]
          ].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm font-medium text-neutral-800 active:bg-neutral-50">{label}<span className="ml-2 text-primary-600">→</span></Link>)}
        </div>
      </DashboardSection>
    </DashboardShell>
  );
}
