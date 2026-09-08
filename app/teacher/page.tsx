import Link from "next/link";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";
import { DashboardList, DashboardSection, DashboardShell, MiniTable, type DashboardItem } from "@/components/shared/role-dashboard";

function pakistanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function TeacherHomePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const t = await getT();
  const today = pakistanDate();
  const weekDate = new Date(`${today}T12:00:00+05:00`);
  weekDate.setDate(weekDate.getDate() + 7);
  const weekEnd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(weekDate);

  const [scheduleRes, papersRes, resultsRes, classTeacherRes, alertsRes, messagesRes] = await Promise.all([
    supabase.from("schedule_items").select("id,title,class_id,subject_id,scheduled_date,status,teacher_id").eq("teacher_id", profile?.user_id ?? "").gte("scheduled_date", today).lte("scheduled_date", weekEnd).order("scheduled_date"),
    supabase.from("exam_papers").select("schedule_item_id,status,print_status"),
    supabase.from("test_results").select("schedule_item_id").eq("entered_by", profile?.user_id ?? ""),
    supabase.from("class_teachers").select("class_id,section_id").eq("teacher_id", profile?.user_id ?? "").maybeSingle(),
    supabase.from("alerts").select("id,message,severity").eq("teacher_id", profile?.user_id ?? "").eq("status", "open").order("created_at", { ascending: false }).limit(5),
    supabase.from("messages").select("id").eq("recipient_id", profile?.user_id ?? "").is("read_at", null)
  ]);

  const schedule = (scheduleRes.data ?? []) as { id: string; title: string; class_id: string; subject_id: string; scheduled_date: string; status: string; teacher_id: string | null }[];
  const papers = (papersRes.data ?? []) as { schedule_item_id: string; status: string; print_status: string | null }[];
  const results = (resultsRes.data ?? []) as { schedule_item_id: string }[];
  const classTeacher = classTeacherRes.data as { class_id: string; section_id: string } | null;
  const openAlerts = (alertsRes.data ?? []) as { id: string; message: string; severity: string }[];
  const paperBySchedule = new Map(papers.map((p) => [p.schedule_item_id, p]));
  const resultIds = new Set(results.map((r) => r.schedule_item_id));
  const todayItems = schedule.filter((s) => s.scheduled_date === today);
  const pendingPapers = schedule.filter((s) => !paperBySchedule.has(s.id) || ["draft", "submitted", "under_review"].includes(paperBySchedule.get(s.id)?.status ?? "")).length;
  const pendingResults = schedule.filter((s) => s.scheduled_date < today && !resultIds.has(s.id)).length;
  const unread = (messagesRes.data ?? []).length;

  const attention: DashboardItem[] = [
    ...openAlerts.slice(0, 3).map((a) => ({ title: a.message, detail: "Teacher action required", href: "/teacher/alerts", tone: a.severity === "critical" || a.severity === "urgent" ? "danger" as const : "warning" as const, badge: a.severity, icon: "alert" })),
    ...(pendingResults ? [{ title: `${pendingResults} result${pendingResults === 1 ? "" : "s"} still pending`, detail: "Enter and submit marks for completed assessments.", href: "/teacher/exams", tone: "warning" as const, badge: "Results", icon: "check" }] : []),
    ...(pendingPapers ? [{ title: `${pendingPapers} paper${pendingPapers === 1 ? "" : "s"} need action`, detail: "Prepare, submit, or correct the assessment paper.", href: "/teacher/exams", tone: "warning" as const, badge: "Papers", icon: "file" }] : []),
    ...(unread ? [{ title: `${unread} unread message${unread === 1 ? "" : "s"}`, detail: "Open your messages.", href: "/teacher/messages", tone: "info" as const, badge: "Message", icon: "people" }] : [])
  ].slice(0, 5);

  const scheduleRows = todayItems.slice(0, 6).map((item) => [<Bdi key="title">{item.title}</Bdi>, item.status.replaceAll("_", " "), "Open →"]);

  return (
    <DashboardShell
      eyebrow="School OS · Daily Workspace"
      title={`Good morning${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ", Sir/Ma'am"}`}
      subtitle={classTeacher ? "Your classes, attendance, assessments, and student work for today." : "Your classes, assessments, and student work for today."}
      metrics={[
        { label: "Today's classes", value: todayItems.length, detail: "scheduled", tone: "info", href: "/teacher/exams" },
        { label: "Pending papers", value: pendingPapers, detail: "needs action", tone: pendingPapers ? "warning" : "success", href: "/teacher/exams" },
        { label: "Results pending", value: pendingResults, detail: "after completed tests", tone: pendingResults ? "warning" : "success", href: "/teacher/exams" },
        { label: "Needs attention", value: openAlerts.length + unread, detail: "alerts + messages", tone: openAlerts.length ? "danger" : "neutral", href: "/teacher/alerts" }
      ]}
      quickActions={[
        { label: "Take attendance", href: "/teacher/attendance", icon: "check", primary: true },
        { label: "My assessments", href: "/teacher/exams", icon: "book" },
        { label: "Add marks", href: "/teacher/exams", icon: "target" },
        { label: "Messages", href: "/teacher/messages", icon: "people" }
      ]}
    >
      <DashboardSection title="Today's schedule" action={{ label: "View week", href: "/teacher/exams" }}>
        {scheduleRows.length ? <MiniTable headers={["Assessment", "Status", "Open"]} rows={scheduleRows} href="/teacher/exams" /> : <DashboardList items={[]} />}
      </DashboardSection>

      <DashboardSection title="Needs attention" action={{ label: "View alerts", href: "/teacher/alerts" }}>
        <DashboardList items={attention} />
      </DashboardSection>

      <DashboardSection title="Assessment workflow">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            ["Take attendance", "/teacher/attendance"],
            ["Prepare paper", "/teacher/exams"],
            ["Enter marks", "/teacher/exams"],
            ["Review students", "/teacher/exams"]
          ].map(([label, href]) => <Link key={href + label} href={href} className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm font-medium text-neutral-800 active:bg-neutral-50">{label}<span className="ml-2 text-primary-600">→</span></Link>)}
        </div>
      </DashboardSection>

      <DashboardSection title="Your progress">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xl font-semibold text-neutral-900">{schedule.length}</p><p className="text-[11px] text-neutral-500">This week</p></div>
            <div><p className="text-xl font-semibold text-neutral-900">{results.length}</p><p className="text-[11px] text-neutral-500">Marks entered</p></div>
            <div><p className="text-xl font-semibold text-neutral-900">{classTeacher ? "Yes" : "—"}</p><p className="text-[11px] text-neutral-500">Class teacher</p></div>
          </div>
        </div>
      </DashboardSection>
    </DashboardShell>
  );
}
