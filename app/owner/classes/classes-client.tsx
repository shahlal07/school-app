"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider } from "@/components/ui/toast";
import type { Profile } from "@/types/database";
import type { Class, ClassTeacher, Section } from "@/types/examination";

import { AssignClassTeacherDialog, type ClassSectionTarget } from "./assign-class-teacher-dialog";

interface ClassesClientProps {
  classes: Class[];
  sections: Section[];
  classTeachers: ClassTeacher[];
  teachers: Profile[];
}

interface SectionRow {
  classId: string;
  sectionId: string;
  classLabel: string;
  teacher: Profile | null;
}

function ClassesInner({ classes, sections, classTeachers, teachers }: ClassesClientProps) {
  const router = useRouter();
  const [target, setTarget] = useState<ClassSectionTarget | null>(null);

  const teacherByUserId = useMemo(() => new Map(teachers.map((t) => [t.user_id, t])), [teachers]);
  const classTeacherByKey = useMemo(
    () => new Map(classTeachers.map((ct) => [`${ct.class_id}:${ct.section_id}`, ct])),
    [classTeachers]
  );

  const rows: SectionRow[] = useMemo(() => {
    const classById = new Map(classes.map((c) => [c.id, c]));
    return sections
      .filter((section) => classById.has(section.class_id))
      .map((section) => {
        const klass = classById.get(section.class_id)!;
        const assignment = classTeacherByKey.get(`${section.class_id}:${section.id}`);
        return {
          classId: section.class_id,
          sectionId: section.id,
          classLabel: `${klass.name}-${section.name}`,
          teacher: assignment ? teacherByUserId.get(assignment.teacher_id) ?? null : null
        };
      })
      .sort((a, b) => a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true }));
  }, [classes, sections, classTeacherByKey, teacherByUserId]);

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          title="No sections yet"
          description="Add classes and sections first, then come back to assign homeroom teachers."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Card key={`${row.classId}:${row.sectionId}`}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">{row.classLabel}</p>
                  {row.teacher ? (
                    <p className="mt-1 truncate text-sm text-neutral-600">{row.teacher.full_name}</p>
                  ) : (
                    <Badge variant="warning" className="mt-1">
                      Unassigned
                    </Badge>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setTarget({
                      classId: row.classId,
                      sectionId: row.sectionId,
                      classLabel: row.classLabel,
                      currentTeacherId: row.teacher?.user_id ?? null
                    })
                  }
                >
                  {row.teacher ? "Change" : "Assign"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignClassTeacherDialog
        target={target}
        teachers={teachers}
        onClose={() => setTarget(null)}
        onChanged={() => {
          setTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}

export function ClassesClient(props: ClassesClientProps) {
  return (
    <ToastProvider>
      <ClassesInner {...props} />
    </ToastProvider>
  );
}
