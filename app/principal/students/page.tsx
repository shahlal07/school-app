import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { StudentsManager } from "@/components/examination/students-manager";
import type { Class, Section, Student } from "@/types/examination";
import { getT } from "@/lib/i18n/get-translator";

/**
 * Full read+write mirror of app/owner/students/page.tsx - principal has
 * can_manage_student_records() (the same full read+write grant as owner and
 * clerk) on students/classes/sections, so <StudentsManager> is reused
 * as-is with no readOnly gating, unlike syllabus/schedule/papers/etc.
 *
 * app/owner/students/actions.ts's add/deactivate/delete/import actions are
 * guarded with requireAnyRole(["owner","principal","clerk"]) (widened
 * alongside the clerk role's build), matching can_manage_student_records()
 * exactly - so principal's writes here actually succeed, not just RLS-permit.
 */
export default async function PrincipalStudentsPage() {
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
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.students")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("principal.students.subtitle")}
      </p>

      <div className="mt-5">
        <StudentsManager
          classes={classes}
          sections={sections}
          students={students}
          resultCardBasePath="/principal/students"
        />
      </div>
    </main>
  );
}
