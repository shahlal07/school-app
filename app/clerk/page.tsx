import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getClerkOperationalSummary } from "@/lib/clerk/dashboard";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";
import { DashboardList, DashboardSection, DashboardShell, MiniTable, type DashboardItem } from "@/components/shared/role-dashboard";

export default async function ClerkHomePage() {
  const profile = await getCurrentProfile();
  const supabase = createClient();
  const t = await getT();
  const [summary, studentsRes, staffRes, papersRes] = await Promise.all([
    getClerkOperationalSummary(),
    supabase.from("students").select("id,name,roll_no,class_id,is_active").eq("is_active", true),
    supabase.from("profiles").select("id,full_name,role,is_active").in("role", ["teacher", "principal", "academic_coordinator", "clerk"]).eq("is_active", true),
    supabase.from("exam_papers").select("id,status,print_status").in("status", ["approved", "submitted", "under_review"])
  ]);

  const students = (studentsRes.data ?? []) as { id: string; name: string; roll_no: string; class_id: string; is_active: boolean }[];
  const staff = (staffRes.data ?? []) as { id: string; full_name: string; role: string; is_active: boolean }[];
  const papers = (papersRes.data ?? []) as { id: string; status: string; print_status: string | null }[];
  const printQueue = papers.filter((p) => p.status === "approved" && p.print_status !== "printed").length;

  const tasks: DashboardItem[] = [
    ...summary.tasks.documents.slice(0, 3).map((d) => ({ title: `Process ${d.document_type} document`, detail: "Student record", href: "/clerk/documents", tone: d.status === "pending" ? "danger" as const : "info" as const, badge: d.status === "pending" ? "High" : "Normal", icon: "file" })),
    ...summary.tasks.admissions.slice(0, 2).map((a) => ({ title: "Follow up admission", detail: a.student_name, href: "/clerk/admissions", tone: a.status === "inquiry" ? "info" as const : "warning" as const, badge: a.status, icon: "users" })),
    ...summary.tasks.fees.slice(0, 2).map((f) => ({ title: "Fee record requires action", detail: `Due ${f.due_date}`, href: "/clerk/fees", tone: f.status === "overdue" ? "danger" as const : "warning" as const, badge: f.status, icon: "clock" }))
  ].slice(0, 6);

  const classCounts = new Map<string, number>();
  for (const student of students) classCounts.set(student.class_id, (classCounts.get(student.class_id) ?? 0) + 1);
  const rosterRows = Array.from(classCounts.entries()).slice(0, 8).map(([classId, count]) => [<Bdi key="class">{classId.slice(0, 8)}</Bdi>, count, "active"]);

  return (
    <DashboardShell
      eyebrow="School OS · Administrative Operations"
      title="Clerk workspace"
      subtitle="Student records, documents, admissions, fees, staff profiles, and examination printing."
      metrics={[
        { label: "Pending documents", value: summary.counts.pendingDocuments, detail: "needs processing", tone: summary.counts.pendingDocuments ? "warning" : "success", href: "/clerk/documents" },
        { label: "New admissions", value: summary.counts.pendingAdmissionsThisMonth, detail: "this month", tone: summary.counts.pendingAdmissionsThisMonth ? "info" : "success", href: "/clerk/admissions" },
        { label: "Fee records", value: summary.counts.pendingOrOverdueFees, detail: "pending or overdue", tone: summary.counts.pendingOrOverdueFees ? "warning" : "success", href: "/clerk/fees" },
        { label: "Print queue", value: printQueue, detail: "exam papers", tone: printQueue ? "warning" : "success", href: "/clerk/papers" }
      ]}
      quickActions={[
        { label: "Student records", href: "/clerk/students", icon: "users", primary: true },
        { label: "Printing", href: "/clerk/papers", icon: "printer" },
        { label: "Staff", href: "/clerk/staff", icon: "people" },
        { label: "Documents", href: "/clerk/documents", icon: "file" }
      ]}
    >
      <DashboardSection title="Recent tasks" action={{ label: "View documents", href: "/clerk/documents" }}>
        <DashboardList items={tasks} />
      </DashboardSection>

      <DashboardSection title="Quick actions">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            ["Student records", "/clerk/students"],
            ["Staff directory", "/clerk/staff"],
            ["Fee management", "/clerk/fees"],
            ["Admissions", "/clerk/admissions"],
            ["Document center", "/clerk/documents"],
            ["Printing queue", "/clerk/papers"]
          ].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm font-medium text-neutral-800 active:bg-neutral-50">{label}<span className="ml-2 text-primary-600">→</span></Link>)}
        </div>
      </DashboardSection>

      <DashboardSection title="Student roster" action={{ label: "Manage students", href: "/clerk/students" }}>
        {rosterRows.length ? <MiniTable headers={["Class ID", "Students", "Status"]} rows={rosterRows} href="/clerk/students" /> : <DashboardList items={[]} />}
      </DashboardSection>

      <DashboardSection title="Staff directory" action={{ label: "Open staff", href: "/clerk/staff" }}>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div><p className="text-2xl font-semibold text-neutral-900">{staff.length}</p><p className="text-xs text-neutral-500">Active staff</p></div>
            <div><p className="text-2xl font-semibold text-neutral-900">{students.length}</p><p className="text-xs text-neutral-500">Active students</p></div>
          </div>
          <Link href="/clerk/staff" className="mt-4 block rounded-xl bg-neutral-50 px-3 py-2.5 text-center text-xs font-semibold text-neutral-700">Edit staff usernames & profiles →</Link>
        </div>
      </DashboardSection>
    </DashboardShell>
  );
}
