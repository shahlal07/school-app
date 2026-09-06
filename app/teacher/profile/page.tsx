import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Class, ClassTeacher, Section, Subject } from "@/types/examination";

interface AssignmentRow {
  subject_id: string;
  class_id: string;
}

export default async function TeacherProfilePage() {
  const profile = await requireRole("teacher");
  const supabase = createClient();

  const [assignmentsRes, subjectsRes, classesRes, sectionsRes, classTeacherRes] = await Promise.all([
    supabase.from("teacher_subjects").select("subject_id, class_id").eq("teacher_id", profile.user_id),
    supabase.from("subjects").select("*"),
    supabase.from("classes").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("class_teachers").select("*").eq("teacher_id", profile.user_id).maybeSingle()
  ]);

  const assignments = (assignmentsRes.data as AssignmentRow[] | null) ?? [];
  const subjectById = new Map(((subjectsRes.data as Subject[] | null) ?? []).map((s) => [s.id, s]));
  const classById = new Map(((classesRes.data as Class[] | null) ?? []).map((c) => [c.id, c]));
  const sectionById = new Map(((sectionsRes.data as Section[] | null) ?? []).map((s) => [s.id, s]));

  const classTeacherRow = classTeacherRes.data as ClassTeacher | null;
  const homeroomLabel = classTeacherRow
    ? (() => {
        const klass = classById.get(classTeacherRow.class_id);
        const section = sectionById.get(classTeacherRow.section_id);
        return klass && section ? `${klass.name}-${section.name}` : null;
      })()
    : null;

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900">Profile</h1>

      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Avatar name={profile.full_name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-neutral-900">{profile.full_name}</p>
            {profile.username && (
              <p className="truncate text-sm text-neutral-500">@{profile.username}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="neutral">Teacher</Badge>
              {homeroomLabel && <Badge variant="info">Class Teacher of {homeroomLabel}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned subjects</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No subjects assigned yet - contact the school owner.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {assignments.map((assignment) => {
                const subject = subjectById.get(assignment.subject_id);
                const klass = classById.get(assignment.class_id);
                return (
                  <li
                    key={`${assignment.subject_id}-${assignment.class_id}`}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-neutral-900">
                      {subject?.name ?? "Unknown subject"}
                    </span>
                    <span className="text-sm text-neutral-500">{klass?.name ?? "Unknown class"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-neutral-400">
        Need a password reset or a subject change? Contact the school owner directly.
      </p>
    </main>
  );
}
