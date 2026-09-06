import Link from "next/link";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCard {
  label: string;
  value: number;
  href?: string;
}

const secondaryLinkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200";

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

/**
 * Principal landing page. Reuses the exact same Supabase query pattern as
 * app/owner/page.tsx (classes/subjects/students/teachers counts + syllabus
 * coverage) - principal has school-wide read access to these tables via
 * can_view_school_wide()/can_manage_student_records(), so no RLS changes
 * were needed for this page. Copy is adapted so it doesn't call the
 * signed-in user "the owner" (an owner previewing this page via
 * requireAnyRole(["owner","principal"]) in the layout would find that
 * confusing too).
 */
export default async function PrincipalHomePage() {
  const profile = await requireAnyRole(["owner", "principal"]);
  const supabase = createClient();

  const [
    classesCountRes,
    activeSubjectsCountRes,
    activeStudentsCountRes,
    activeTeachersCountRes,
    allSubjectsRes,
    allChaptersRes
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("is_active", true),
    supabase.from("subjects").select("id"),
    supabase.from("chapters").select("subject_id")
  ]);

  const totalClasses = classesCountRes.count ?? 0;
  const totalActiveSubjects = activeSubjectsCountRes.count ?? 0;
  const totalActiveStudents = activeStudentsCountRes.count ?? 0;
  const totalActiveTeachers = activeTeachersCountRes.count ?? 0;

  const allSubjectIds = (
    (allSubjectsRes.data as { id: string }[] | null) ?? []
  ).map((subject) => subject.id);
  const subjectIdsWithChapters = new Set(
    ((allChaptersRes.data as { subject_id: string }[] | null) ?? []).map(
      (chapter) => chapter.subject_id
    )
  );

  const totalSubjects = allSubjectIds.length;
  const subjectsWithSyllabus = allSubjectIds.filter((id) =>
    subjectIdsWithChapters.has(id)
  ).length;
  const subjectsWithoutSyllabus = totalSubjects - subjectsWithSyllabus;

  // "Active teachers" is shown as a plain stat, not a link - inviting
  // teachers and managing accounts is owner-only system administration and
  // there is no /principal/teachers page to send this card to.
  const statCards: StatCard[] = [
    { label: "Classes", value: totalClasses, href: "/principal/syllabus" },
    { label: "Active subjects", value: totalActiveSubjects, href: "/principal/syllabus" },
    { label: "Active students", value: totalActiveStudents, href: "/principal/students" },
    { label: "Active teachers", value: totalActiveTeachers }
  ];

  // Only the students prompt is actionable by a principal - inviting a
  // teacher is a system-administration action reserved for the owner, so
  // that prompt is intentionally not offered here.
  const showSetupPrompts = totalActiveStudents === 0;

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Welcome back, {profile.full_name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        A snapshot of your school&apos;s setup right now.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="py-5">
                  <p className="text-2xl font-semibold text-neutral-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={stat.label} className="h-full">
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-neutral-900">{stat.value}</p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Syllabus coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-neutral-900">
              {subjectsWithSyllabus} of {totalSubjects}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              subjects have a syllabus started.
              {subjectsWithoutSyllabus > 0 && (
                <>
                  {" "}
                  {subjectsWithoutSyllabus} subject
                  {subjectsWithoutSyllabus === 1 ? "" : "s"} still need
                  {subjectsWithoutSyllabus === 1 ? "s" : ""} chapters added.
                </>
              )}
            </p>
            <Link href="/principal/syllabus" className={`${secondaryLinkButtonClasses} mt-4`}>
              View syllabus
            </Link>
          </CardContent>
        </Card>

        {showSetupPrompts && (
          <Card>
            <CardHeader>
              <CardTitle>Get set up</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Add students</p>
                    <p className="text-sm text-neutral-500">The student roster is empty.</p>
                  </div>
                  <Link href="/principal/students" className={linkButtonClasses}>
                    Add students
                  </Link>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
