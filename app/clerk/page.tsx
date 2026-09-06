import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classOrderIndex } from "@/components/examination/constants";
import type { Class, Student } from "@/types/examination";

const linkButtonClasses =
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700";

export default async function ClerkHomePage() {
  const supabase = createClient();

  const [classesRes, activeStudentsCountRes, allStudentsRes, activeTeachersCountRes] =
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
        .eq("is_active", true)
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

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Clerk desk</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Admissions and student-record management.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/clerk/students" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="py-5">
              <p className="text-2xl font-semibold text-neutral-900">{totalActiveStudents}</p>
              <p className="mt-1 text-sm text-neutral-500">Active students</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/clerk/students" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="py-5">
              <p className="text-2xl font-semibold text-neutral-900">{classes.length}</p>
              <p className="mt-1 text-sm text-neutral-500">Classes</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/clerk/staff" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="py-5">
              <p className="text-2xl font-semibold text-neutral-900">{totalActiveTeachers}</p>
              <p className="mt-1 text-sm text-neutral-500">Active teachers</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roster by class</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-sm text-neutral-500">No classes found yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {classes.map((klass) => (
                  <li
                    key={klass.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-neutral-900">{klass.name}</span>
                    <span className="text-sm text-neutral-500">
                      {studentsByClass.get(klass.id) ?? 0} students
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/clerk/students" className={`${linkButtonClasses} mt-4`}>
              Manage students
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500">
              Set designation and joining date for teaching staff.
            </p>
            <Link href="/clerk/staff" className={`${linkButtonClasses} mt-4`}>
              Open staff list
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
