import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { StudentsManager } from "@/components/examination/students-manager";
import { getT } from "@/lib/i18n/get-translator";
import type { Class, Section, Student } from "@/types/examination";

export default async function ClerkStudentsPage() {
  const supabase = createClient();
  const t = await getT();

  const [classesRes, sectionsRes, studentsRes] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("students").select("*").order("roll_no", { ascending: true })
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const sections = (sectionsRes.data as Section[] | null) ?? [];
  const students = (studentsRes.data as Student[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("clerk.students.title")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("clerk.students.subtitle")}</p>

      <div className="mt-5">
        <StudentsManager classes={classes} sections={sections} students={students} />
      </div>
    </main>
  );
}
