"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/types/database";
import type { Class, Subject } from "@/types/examination";

import { assignTeacherSubject, unassignTeacherSubject } from "./actions";

export interface TeacherAssignmentRow {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
}

interface AssignSubjectsDialogProps {
  teacher: Profile | null;
  classes: Class[];
  subjectsByClass: Record<string, Subject[]>;
  assignments: TeacherAssignmentRow[];
  onClose: () => void;
  onChanged: () => void;
}

const selectClasses =
  "h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 disabled:text-neutral-400";

export function AssignSubjectsDialog({
  teacher,
  classes,
  subjectsByClass,
  assignments,
  onClose,
  onChanged
}: AssignSubjectsDialogProps) {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const teacherAssignments = useMemo(
    () => (teacher ? assignments.filter((a) => a.teacher_id === teacher.user_id) : []),
    [assignments, teacher]
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const subjectById = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const subjects of Object.values(subjectsByClass)) {
      for (const subject of subjects) map.set(subject.id, subject);
    }
    return map;
  }, [subjectsByClass]);

  const subjectsForSelectedClass = selectedClassId ? subjectsByClass[selectedClassId] ?? [] : [];

  async function handleAdd() {
    if (!teacher || !selectedClassId || !selectedSubjectId) return;
    setAdding(true);
    const result = await assignTeacherSubject(teacher.user_id, selectedSubjectId, selectedClassId);
    setAdding(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast("Assigned", "success");
    setSelectedSubjectId("");
    onChanged();
  }

  async function handleRemove(assignmentId: string) {
    setRemovingId(assignmentId);
    const result = await unassignTeacherSubject(assignmentId);
    setRemovingId(null);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast("Removed", "success");
    onChanged();
  }

  return (
    <Dialog
      open={!!teacher}
      onClose={onClose}
      title={`Assign subjects to ${teacher?.full_name ?? ""}`}
      description="This teacher will only ever see data for the class + subject combinations assigned here - nothing else."
    >
      <div className="flex flex-col gap-4">
        {teacherAssignments.length === 0 ? (
          <p className="text-sm text-neutral-500">No subjects assigned yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teacherAssignments.map((assignment) => {
              const klass = classById.get(assignment.class_id);
              const subject = subjectById.get(assignment.subject_id);
              return (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-sm text-neutral-800">
                    <span className="truncate">{subject?.name ?? "Unknown subject"}</span>
                    <Badge variant="neutral" className="shrink-0">
                      {klass?.name ?? "?"}
                    </Badge>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={removingId === assignment.id}
                    onClick={() => handleRemove(assignment.id)}
                  >
                    <span className="text-danger-600">Remove</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="assign-class">
              Class
            </label>
            <select
              id="assign-class"
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setSelectedSubjectId("");
              }}
              className={selectClasses}
            >
              <option value="">Select a class</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700" htmlFor="assign-subject">
              Subject
            </label>
            <select
              id="assign-subject"
              value={selectedSubjectId}
              onChange={(event) => setSelectedSubjectId(event.target.value)}
              disabled={!selectedClassId}
              className={selectClasses}
            >
              <option value="">Select a subject</option>
              {subjectsForSelectedClass.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            onClick={handleAdd}
            loading={adding}
            disabled={!selectedClassId || !selectedSubjectId}
            className="self-start"
          >
            + Add assignment
          </Button>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
