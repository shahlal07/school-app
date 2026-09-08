import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { OwnerStudentOverview } from "@/components/examination/owner-student-overview";
import type { Class, Section, Student } from "@/types/examination";

export default async function StudentsPage() {
  const supabase = createClient();
  const [classesRes, sectionsRes, studentsRes] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("students").select("*").order("roll_no", { ascending: true })
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? []).slice().sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const sections = (sectionsRes.data as Section[] | null) ?? [];
  const students = (studentsRes.data as Student[] | null) ?? [];

  return <main className="p-4 sm:p-6"><OwnerStudentOverview classes={classes} sections={sections} students={students} /></main>;
}
