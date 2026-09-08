import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAcademicIntelligenceData } from "@/lib/examination/academic-intelligence-data";
import { getDailyAttendanceReport } from "@/lib/attendance/report";
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

export default async function PrincipalHomePage() {
  await requireAnyRole(["owner", "principal"]);
  const supabase = createClient();
  const t = await getT();
  const intelligence = await getAcademicIntelligenceData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const tomorrowDate = new Date(`${today}T12:00:00+05:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(tomorrowDate);

  const [attendanceRes, scheduleRes, papersRes, submissionsRes, examSetsRes] = await Promise.all([
    getDailyAttendanceReport(today),
    supabase.from("schedule_items").select("id,class_id,subject_id,title,scheduled_date,status").gte("scheduled_date", today).lte("scheduled_date", tomorrow).neq("status", "cancelled").order("scheduled_date"),
    supabase.from("exam_papers").select("status,print_status"),
    supabase.from("result_submissions").select("status"),
    supabase.from("exam_sets").select("id,set_number,status,class_id").in("status", ["planned", "active", "awaiting_completion"])
  ]);

  const attendanceRows = attendanceRes.rows;
  const attendanceTotal = attendanceRows.reduce((n, r) => n + r.total_students, 0);
  const attendancePresent = attendanceRows.reduce((n, r) => n + r.present_count, 0);
  const attendancePct = attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 1000) / 10 : null;
  const schedule = (scheduleRes.data ?? []) as { id: string; class_id: string; subject_id: string; title: string; scheduled_date: string; status: string }[];
  const papers = (papersRes.data ?? []) as { status: string; print_status: string | null }[];
  const submissions = (submissionsRes.data ?? []) as { status: string }[];
  const paperBacklog = papers.filter((p) => ["submitted", "under_review"].includes(p.status)).length;
  const printBacklog = papers.filter((p) => p.status === "approved" && p.print_status !== "printed").length;
  const resultBacklog = submissions.filter((r) => r.status === "submitted").length;
  const readiness = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("exam"))?.score ?? 0;
  const syllabus = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("syllabus"))?.score ?? 0;

  const focus: DashboardItem[] = [
    ...intelligence.dangers.slice(0, 3).map((d) => ({ title: d.label, detail: d.detail, href: d.href ?? "/principal/alerts", tone: d.severity === "critical" || d.severity === "urgent" ? "danger" as const : "warning" as const, badge: d.severity === "critical" ? "Critical" : "Review", icon: "alert" })),
    ...(intelligence.studentRisks.length ? [{ title: `${intelligence.studentRisks.length} students need attention`, detail: "Repeated academic weakness detected in recent assessments.", href: "/principal/performance", tone: "warning" as const, badge: "Students", icon: "users" }] : []),
    ...(paperBacklog ? [{ title: `${paperBacklog} papers awaiting approval`, href: "/principal/papers", tone: "info" as const, badge: "Papers", icon: "file" }] : []),
    ...(resultBacklog ? [{ title: `${resultBacklog} results awaiting finalization`, href: "/principal/results", tone: "warning" as const, badge: "Results", icon: "check" }] : [])
  ].slice(0, 5);

  const todayExams = schedule.filter((s) => s.scheduled_date === today);
  const tomorrowExams = schedule.filter((s) => s.scheduled_date === tomorrow);
  const upcomingRows = [...todayExams, ...tomorrowExams].slice(0, 5).map((item) => [
    <Bdi key="title">{item.title}</Bdi>,
    item.scheduled_date === today ? "Today" : "Tomorrow",
    item.status.replaceAll("_", " ")
  ]);

  return (
    <DashboardShell
      eyebrow="School OS · School Leadership"
      title="Principal overview"
      subtitle="Academic progress, school health, and the issues that require leadership attention."
      metrics={[
        { label: "Academic health", value: intelligence.healthScore, detail: "school-wide", tone: intelligence.healthScore >= 70 ? "success" : "warning", href: "/principal/academic-health" },
        { label: "Attendance", value: attendancePct == null ? "—" : `${attendancePct}%`, detail: "today", tone: attendancePct == null ? "neutral" : attendancePct >= 90 ? "success" : "warning", href: "/principal/attendance" },
        { label: "Exam readiness", value: `${readiness}%`, detail: "next 7 days", tone: readiness >= 80 ? "success" : "warning", href: "/principal/schedule" },
        { label: "Students at risk", value: intelligence.studentRisks.length, detail: "requiring attention", tone: intelligence.studentRisks.length ? "danger" : "success", href: "/principal/students" }
      ]}
      quickActions={[
        { label: "Academic health", href: "/principal/academic-health", icon: "chart" },
        { label: "Students", href: "/principal/students", icon: "users" },
        { label: "Attendance", href: "/principal/attendance", icon: "check" },
        { label: "Reports", href: "/principal/reports", icon: "file" }
      ]}
    >
      <DashboardSection title="School performance" action={{ label: "View performance", href: "/principal/performance" }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProgressCard title="Academic health" value={intelligence.healthScore} detail="Overall academic state" href="/principal/academic-health" tone={intelligence.healthScore >= 70 ? "success" : "warning"} />
          <ProgressCard title="Syllabus progress" value={syllabus} detail="Covered topics across subjects" href="/principal/syllabus" />
        </div>
      </DashboardSection>

      <DashboardSection title="Today's leadership brief" action={{ label: "Open alerts", href: "/principal/alerts" }}>
        <DashboardList items={focus} />
      </DashboardSection>

      <DashboardSection title="Exams today & tomorrow" action={{ label: "Schedule", href: "/principal/schedule" }}>
        {upcomingRows.length ? <MiniTable headers={["Assessment", "When", "Status"]} rows={upcomingRows} href="/principal/schedule" /> : <DashboardList items={[]} />}
      </DashboardSection>

      <DashboardSection title="Operational health">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ProgressCard title="Readiness" value={readiness} detail="Exam pipeline" href="/principal/schedule" />
          <ProgressCard title="Paper approvals" value={paperBacklog ? 0 : 100} detail={`${paperBacklog} pending`} href="/principal/papers" tone={paperBacklog ? "warning" : "success"} />
          <ProgressCard title="Printing" value={printBacklog ? 0 : 100} detail={`${printBacklog} pending`} href="/principal/papers" tone={printBacklog ? "warning" : "success"} />
          <ProgressCard title="Results" value={resultBacklog ? 0 : 100} detail={`${resultBacklog} pending`} href="/principal/results" tone={resultBacklog ? "warning" : "success"} />
        </div>
      </DashboardSection>

      <DashboardSection title="Leadership shortcuts">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            ["Class performance", "/principal/classes"],
            ["Interventions", "/principal/interventions"],
            ["Attendance", "/principal/attendance"],
            ["Reports", "/principal/reports"]
          ].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm font-medium text-neutral-800 active:bg-neutral-50">{label}<span className="ml-2 text-primary-600">→</span></Link>)}
        </div>
      </DashboardSection>
    </DashboardShell>
  );
}
