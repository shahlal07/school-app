"use client";

import { useState } from "react";

import type { Student } from "@/types/examination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/examination/confirm-dialog";
import { deleteStudent, setStudentActive } from "@/app/owner/students/actions";

interface StudentRowProps {
  student: Student;
  onChanged: () => void;
}

export function StudentRow({ student, onChanged }: StudentRowProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    const result = await setStudentActive(student.id, !student.is_active);
    setToggling(false);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    onChanged();
  };

  const handleDelete = async () => {
    const result = await deleteStudent(student.id);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    setDeleting(false);
    toast("Student removed", "success");
    onChanged();
  };

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{student.name}</p>
        <p className="text-xs text-neutral-500">Roll No. {student.roll_no}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!student.is_active && <Badge variant="neutral">Inactive</Badge>}
        <Button variant="ghost" size="sm" loading={toggling} onClick={handleToggle}>
          {student.is_active ? "Deactivate" : "Activate"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
          <span className="text-danger-600">Remove</span>
        </Button>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Remove student?"
        description={`"${student.name}" will be permanently removed from the roster.`}
        confirmLabel="Remove"
        destructive
        onClose={() => setDeleting(false)}
        onConfirm={handleDelete}
      />
    </li>
  );
}
