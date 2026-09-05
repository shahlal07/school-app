import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCard {
  label: string;
  value: number;
  href: string;
}

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

const secondaryLinkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200";

export default async function OwnerHomePage() {
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

  const statCards: StatCard[] = [
    { label: "Classes", value: totalClasses, href: "/owner/syllabus" },
    { label: "Active subjects", value: totalActiveSubjects, href: "/owner/syllabus" },
    { label: "Active students", value: totalActiveStudents, href: "/owner/students" },
    { label: "Active teachers", value: totalActiveTeachers, href: "/owner/teachers" }
  ];

  const needsTeacher = totalActiveTeachers === 0;
  const needsStudents = totalActiveStudents === 0;
  const showSetupPrompts = needsTeacher || needsStudents;

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Owner console</h1>
      <p className="mt-1 text-sm text-neutral-500">
        A snapshot of your school&apos;s setup right now.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="py-5">
                <p className="text-2xl font-semibold text-neutral-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
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
            <Link href="/owner/syllabus" className={`${secondaryLinkButtonClasses} mt-4`}>
              Manage syllabus
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
                {needsTeacher && (
                  <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Invite a teacher
                      </p>
                      <p className="text-sm text-neutral-500">
                        No teacher accounts yet.
                      </p>
                    </div>
                    <Link href="/owner/teachers" className={linkButtonClasses}>
                      Invite teacher
                    </Link>
                  </li>
                )}
                {needsStudents && (
                  <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        Add students
                      </p>
                      <p className="text-sm text-neutral-500">
                        The student roster is empty.
                      </p>
                    </div>
                    <Link href="/owner/students" className={linkButtonClasses}>
                      Add students
                    </Link>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
