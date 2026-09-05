"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Class, Section, Student } from "@/types/examination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { StudentRow } from "@/components/examination/student-row";
import { AddStudentDialog } from "@/components/examination/add-student-dialog";
import { ImportCsvDialog } from "@/components/examination/import-csv-dialog";
import type { ImportSummary } from "@/app/owner/students/actions";

export interface StudentsManagerProps {
  classes: Class[];
  sections: Section[];
  students: Student[];
}

function StudentsInner({ classes, sections, students }: StudentsManagerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(classes[0]?.id);
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const classSections = useMemo(
    () => sections.filter((section) => section.class_id === selectedClassId),
    [sections, selectedClassId]
  );

  const effectiveSectionId =
    selectedSectionId && classSections.some((section) => section.id === selectedSectionId)
      ? selectedSectionId
      : classSections[0]?.id;

  const rosterStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.class_id === selectedClassId && student.section_id === effectiveSectionId
      ),
    [students, selectedClassId, effectiveSectionId]
  );

  if (classes.length === 0) {
    return <EmptyState title="No classes found" description="Classes need to be seeded first." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Classes" className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {classes.map((klass) => {
          const isSelected = klass.id === selectedClassId;
          return (
            <button
              key={klass.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setSelectedClassId(klass.id);
                setSelectedSectionId(undefined);
              }}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {klass.name}
            </button>
          );
        })}
      </div>

      {classSections.length > 1 && (
        <div className="flex gap-1.5">
          {classSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setSelectedSectionId(section.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                section.id === effectiveSectionId
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Section {section.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">
          {rosterStudents.length} {rosterStudents.length === 1 ? "student" : "students"}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            + Add student
          </Button>
        </div>
      </div>

      {rosterStudents.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add students manually or import a CSV roster."
          actionLabel="Add student"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rosterStudents.map((student) => (
            <StudentRow key={student.id} student={student} onChanged={() => router.refresh()} />
          ))}
        </ul>
      )}

      <AddStudentDialog
        open={addOpen}
        classId={selectedClassId}
        sectionId={effectiveSectionId}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          router.refresh();
          toast("Student added", "success");
        }}
      />

      <ImportCsvDialog
        open={importOpen}
        classId={selectedClassId}
        sectionId={effectiveSectionId}
        onClose={() => setImportOpen(false)}
        onImported={(summary: ImportSummary) => {
          router.refresh();
          toast(
            `Imported ${summary.imported} student(s)${
              summary.skipped.length ? `, ${summary.skipped.length} skipped` : ""
            }`,
            summary.skipped.length ? "warning" : "success"
          );
        }}
      />
    </div>
  );
}

export function StudentsManager(props: StudentsManagerProps) {
  return (
    <ToastProvider>
      <StudentsInner {...props} />
    </ToastProvider>
  );
}
