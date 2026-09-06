import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { ClassesClient } from "@/app/owner/classes/classes-client";
import type { Profile } from "@/types/database";
import type { Class, ClassTeacher, Section } from "@/types/examination";
import { getT } from "@/lib/i18n/get-translator";

// Auth inherited from app/principal/layout.tsx's requireAnyRole(["owner",
// "principal"]). Reuses the exact same ClassesClient/actions the owner's
// /owner/classes page uses - class_teachers write authority is owner +
// principal + academic_coordinator, matching the DB policy exactly.
export default async function PrincipalClassTeachersPage() {
  const supabase = createClient();
  const t = await getT();

  const [classesRes, sectionsRes, classTeachersRes, teachersRes] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("class_teachers").select("*"),
    supabase.from("profiles").select("*").eq("role", "teacher").order("full_name", { ascending: true })
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const sections = (sectionsRes.data as Section[] | null) ?? [];
  const classTeachers = (classTeachersRes.data as ClassTeacher[] | null) ?? [];
  const teachers = (teachersRes.data as Profile[] | null) ?? [];

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.classTeachers")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("principal.classes.subtitle")}
      </p>

      <div className="mt-5">
        <ClassesClient
          classes={classes}
          sections={sections}
          classTeachers={classTeachers}
          teachers={teachers}
        />
      </div>
    </main>
  );
}
