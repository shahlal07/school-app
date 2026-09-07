import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getClerkOperationalSummary } from "@/lib/clerk/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Bdi } from "@/components/shared/bdi";
import { classOrderIndex } from "@/components/examination/constants";
import { getT } from "@/lib/i18n/get-translator";
import { PlainStatTile } from "@/components/shared/dashboard-charts";
import type { Class, Student } from "@/types/examination";

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

interface ClerkTaskItem {
  id: string;
  text: string;
  meta: string;
  href: string;
  priority: "high" | "normal";
}

/**
 * Stat tiles / Tasks / Quick Links here are wired against
 * getClerkOperationalSummary() (lib/clerk/dashboard.ts) - the real data
 * helper the concurrent Phase 3 session built specifically so this page
 * could be wired up afterward without either session touching this file at
 * the same time. Greeting/roster-by-class/staff-records sections below
 * predate that phase and are kept as-is (still real, still useful).
 */
export default async function ClerkHomePage() {
  const supabase = createClient();
  const t = await getT();
  const profile = await getCurrentProfile();

  const [classesRes, activeStudentsCountRes, allStudentsRes, activeTeachersCountRes, summary] =
    await Promise.all([
      supabase.from("classes").select("*"),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // `students` has no created_at column to sort a "recent additions" list
      // by, so instead we break the active roster down per class - real
      // data, still useful for an admissions-focused landing page.
      supabase.from("students").select("class_id, is_active").eq("is_active", true),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "teacher")
        .eq("is_active", true),
      getClerkOperationalSummary()
    ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const totalActiveStudents = activeStudentsCountRes.count ?? 0;
  const totalActiveTeachers = activeTeachersCountRes.count ?? 0;

  const studentsByClass = new Map<string, number>();
  for (const row of (allStudentsRes.data as Pick<Student, "class_id" | "is_active">[] | null) ??
    []) {
    studentsByClass.set(row.class_id, (studentsByClass.get(row.class_id) ?? 0) + 1);
  }

  // ---- Student names for document/fee task rows (admissions already
  // carries student_name directly) ----
  const documentStudentIds = summary.tasks.documents.map((d) => d.student_id);
  const feeStudentIds = summary.tasks.fees.map((f) => f.student_id);
  const neededStudentIds = Array.from(new Set([...documentStudentIds, ...feeStudentIds]));
  const { data: taskStudentsData } = neededStudentIds.length
    ? await supabase.from("students").select("id, name").in("id", neededStudentIds)
    : { data: [] as { id: string; name: string }[] };
  const studentNameById = new Map(((taskStudentsData as { id: string; name: string }[] | null) ?? []).map((s) => [s.id, s.name]));

  const tasks: ClerkTaskItem[] = [
    ...summary.tasks.documents.map((d) => ({
      id: `doc-${d.id}`,
      text: `Process ${d.document_type} document`,
      meta: studentNameById.get(d.student_id) ?? "Student",
      href: "/clerk/documents",
      priority: d.status === "pending" ? ("high" as const) : ("normal" as const)
    })),
    ...summary.tasks.admissions.map((a) => ({
      id: `adm-${a.id}`,
      text: `Follow up on admission`,
      meta: a.student_name,
      href: "/clerk/admissions",
      priority: a.status === "inquiry" ? ("normal" as const) : ("high" as const)
    })),
    ...summary.tasks.fees.map((f) => ({
      id: `fee-${f.id}`,
      text: `Collect fee record`,
      meta: `${studentNameById.get(f.student_id) ?? "Student"} · due ${f.due_date}`,
      href: "/clerk/fees",
      priority: f.status === "overdue" ? ("high" as const) : ("normal" as const)
    }))
  ].slice(0, 6);

  const firstName = profile?.full_name.split(" ")[0] ?? null;
  const hour = new Date().getUTCHours();
  const greetingWord = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">
        {greetingWord}{firstName ? <>, <Bdi>{firstName}</Bdi></> : null}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{t("clerk.home.subtitle")}</p>

      {/* Operational stat tiles */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Link href="/clerk/documents" className="block">
          <PlainStatTile label="Pending Documents" value={summary.counts.pendingDocuments} />
        </Link>
        <Link href="/clerk/admissions" className="block">
          <PlainStatTile label="New Admissions" value={summary.counts.pendingAdmissionsThisMonth} />
        </Link>
        <Link href="/clerk/fees" className="block">
          <PlainStatTile label="Fee Records" value={summary.counts.pendingOrOverdueFees} />
        </Link>
      </div>

      {/* Tasks */}
      <Card className="mt-4">
        <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <EmptyState title="Nothing pending" description="Document, admission, and fee tasks will appear here." />
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href={task.href} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary-700">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900"><Bdi>{task.text}</Bdi></p>
                      <p className="truncate text-xs text-neutral-500"><Bdi>{task.meta}</Bdi></p>
                    </div>
                    <Badge variant={task.priority === "high" ? "danger" : "neutral"}>
                      {task.priority === "high" ? "High" : "Normal"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Quick Links</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href="/clerk/documents" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Documents</Link>
          <Link href="/clerk/fees" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Fee Management</Link>
          <Link href="/clerk/admissions" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Admissions</Link>
          <Link href="/clerk/students" className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Student Records</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/clerk/students" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="py-5">
              <p className="text-2xl font-semibold text-neutral-900">
                <Bdi>{totalActiveStudents}</Bdi>
              </p>
              <p className="mt-1 text-sm text-neutral-500">{t("ownerDashboard.activeStudents")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/clerk/students" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="py-5">
              <p className="text-2xl font-semibold text-neutral-900">
                <Bdi>{classes.length}</Bdi>
              </p>
              <p className="mt-1 text-sm text-neutral-500">{t("ownerDashboard.classes")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/clerk/staff" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="py-5">
              <p className="text-2xl font-semibold text-neutral-900">
                <Bdi>{totalActiveTeachers}</Bdi>
              </p>
              <p className="mt-1 text-sm text-neutral-500">{t("ownerDashboard.activeTeachers")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("clerk.home.rosterByClass")}</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("clerk.home.noClassesFound")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {classes.map((klass) => (
                  <li
                    key={klass.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-neutral-900">
                      <Bdi>{klass.name}</Bdi>
                    </span>
                    <span className="text-sm text-neutral-500">
                      <Bdi>{studentsByClass.get(klass.id) ?? 0}</Bdi> {t("clerk.home.studentsSuffix")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/clerk/students" className={`${linkButtonClasses} mt-4`}>
              {t("clerk.home.manageStudents")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("clerk.home.staffRecords")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">{t("clerk.home.staffRecordsDescription")}</p>
            <Link href="/clerk/staff" className={`${linkButtonClasses} mt-4`}>
              {t("clerk.home.openStaffList")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
