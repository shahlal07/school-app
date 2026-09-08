import Link from "next/link";

import { requireRole } from "@/lib/auth/session";
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
  TrendCard,
  type DashboardItem
} from "@/components/shared/role-dashboard";

function percentage(present: number, total: number): number | null {
  return total > 0 ? Math.round((present / total) * 1000) / 10 : null;
}

export default async function OwnerHomePage() {
  await requireRole("owner");
  const supabase = createClient();
  const t = await getT();
  const intelligence = await getAcademicIntelligenceData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const [attendanceRes, completedSetsRes, activeStudentsRes, activeTeachersRes] = await Promise.all([
    getDailyAttendanceReport(today),
    supabase.from("exam_sets").select("id,set_number,completed_on").eq("status", "completed").order("completed_on", { ascending: false }).limit(4),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("is_active", true)
  ]);

  const attendanceRows = attendanceRes.rows;
  const attendanceTotal = attendanceRows.reduce((n, r) => n + r.total_students, 0);
  const attendancePresent = attendanceRows.reduce((n, r) => n + r.present_count, 0);
  const attendancePct = percentage(attendancePresent, attendanceTotal);
  const examMetric = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("exam"));
  const teacherMetric = intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("teacher"));

  const completedSets = (completedSetsRes.data ?? []) as { id: string; set_number: number; completed_on: string | null }[];
  const trendPoints = completedSets.length ? completedSets.map(() => intelligence.healthScore).slice().reverse() : [intelligence.healthScore];

  const attentionItems: DashboardItem[] = [
    ...intelligence.dangers.slice(0, 3).map((danger) => ({
      title: danger.label,
      detail: danger.detail,
      href: danger.href,
      tone: danger.severity === "critical" || danger.severity === "urgent" ? "danger" as const : "warning" as const,
      badge: danger.severity === "critical" ? "Critical" : danger.severity === "urgent" ? "Urgent" : "Review",
      icon: "alert"
    })),
    ...(intelligence.studentRisks[0]
      ? [{
          title: `${intelligence.studentRisks.length} students need attention`,
          detail: "Repeated academic weakness is being detected across recent assessments.",
          href: "/owner/performance",
          tone: "danger" as const,
          badge: "Students",
          icon: "users"
        }]
      : [])
  ].slice(0, 4);

  const topTeachers = intelligence.teachers.slice(0, 4).map((teacher) => [
    <Bdi key="name">{teacher.name}</Bdi>,
    `${teacher.score}%`,
    teacher.outcomePassRate == null ? "—" : `${teacher.outcomePassRate}%`
  ]);

  return (
    <DashboardShell
      eyebrow="School OS · Executive Command Center"
      title="School overview"
      subtitle="The few things that need your attention today."
      metrics={[
        { label: "Academic health", value: intelligence.healthScore, detail: "out of 100", tone: intelligence.healthScore >= 70 ? "success" : intelligence.healthScore >= 50 ? "warning" : "danger", href: "/owner/academic-health" },
        { label: "Attendance", value: attendancePct == null ? "—" : `${attendancePct}%`, detail: "today", tone: attendancePct == null ? "neutral" : attendancePct >= 90 ? "success" : "warning", href: "/owner/attendance" },
        { label: "Exam readiness", value: examMetric?.score == null ? "—" : `${examMetric.score}%`, detail: "next 7 days", tone: (examMetric?.score ?? 0) >= 80 ? "success" : "warning", href: "/owner/schedule" },
        { label: "Teacher compliance", value: teacherMetric?.score == null ? "—" : `${teacherMetric.score}%`, detail: "paper · test · result", tone: (teacherMetric?.score ?? 0) >= 90 ? "success" : "warning", href: "/owner/teachers" }
      ]}
      quickActions={[
        { label: "Academic health", href: "/owner/academic-health", icon: "chart" },
        { label: "Reports", href: "/owner/reports", icon: "file" },
        { label: "Students", href: "/owner/students", icon: "users" },
        { label: "Examinations", href: "/owner/schedule", icon: "book" }
      ]}
    >
      <DashboardSection title="Academic performance" action={{ label: "View analytics", href: "/owner/performance" }}>
        <TrendCard title="School health trend" points={trendPoints} href="/owner/performance" />
      </DashboardSection>

      <DashboardSection title="What needs attention" action={{ label: "View all", href: "/owner/alerts" }}>
        <DashboardList items={attentionItems} />
      </DashboardSection>

      <DashboardSection title="School progress">
        <div className="grid gap-3 sm:grid-cols-2">
          <ProgressCard title="Syllabus coverage" value={intelligence.healthMetrics.find((m) => m.label.toLowerCase().includes("syllabus"))?.score ?? 0} detail="Topics covered across active subjects" href="/owner/syllabus" />
          <ProgressCard title="Completed exam sets" value={completedSets.length ? Math.min(100, completedSets.length * 25) : 0} detail={`${completedSets.length} finalized set${completedSets.length === 1 ? "" : "s"} in the current record`} href="/owner/results" />
        </div>
      </DashboardSection>

      <DashboardSection title="Teacher outcomes" action={{ label: "View teachers", href: "/owner/teachers" }}>
        {topTeachers.length ? <MiniTable headers={["Teacher", "Compliance", "Pass rate"]} rows={topTeachers} href="/owner/teachers" /> : <DashboardList items={[]} />}
      </DashboardSection>

      <DashboardSection title="Executive shortcuts">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            ["Students needing attention", "/owner/performance", "users"],
            ["Interventions", "/owner/interventions", "target"],
            ["Attendance", "/owner/attendance", "check"],
            ["Reports", "/owner/reports", "file"]
          ].map(([label, href, icon]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm font-medium text-neutral-800 active:bg-neutral-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-primary-600"><span className="text-xs">{icon === "users" ? "●" : icon === "target" ? "◎" : icon === "check" ? "✓" : "▣"}</span></span>
              {label}
            </Link>
          ))}
        </div>
      </DashboardSection>
    </DashboardShell>
  );
}
