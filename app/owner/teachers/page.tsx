import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { TeachersClient } from "./teachers-client";
import type { Profile } from "@/types/database";
import type { Class, Subject } from "@/types/examination";
import type { TeacherAssignmentRow } from "./assign-subjects-dialog";

export default async function TeachersPage() {
  const supabase = createClient();

  const [teachersRes, classesRes, subjectsRes, assignmentsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "teacher").order("full_name", { ascending: true }),
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*").order("name", { ascending: true }),
    supabase.from("teacher_subjects").select("id, teacher_id, subject_id, class_id")
  ]);

  const teachers = (teachersRes.data as Profile[] | null) ?? [];
  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const assignments = (assignmentsRes.data as TeacherAssignmentRow[] | null) ?? [];

  const subjectsByClass: Record<string, Subject[]> = {};
  for (const subject of subjects) {
    (subjectsByClass[subject.class_id] ??= []).push(subject);
  }

  return (
    <TeachersClient
      teachers={teachers}
      classes={classes}
      subjectsByClass={subjectsByClass}
      assignments={assignments}
    />
  );
}
