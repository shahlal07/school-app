"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addStudent } from "@/app/owner/students/actions";

interface AddStudentDialogProps {
  open: boolean;
  classId: string | undefined;
  sectionId: string | undefined;
  onClose: () => void;
  onAdded: () => void;
}

export function AddStudentDialog({
  open,
  classId,
  sectionId,
  onClose,
  onAdded
}: AddStudentDialogProps) {
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!classId || !sectionId) {
      setError("Select a class and section first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await addStudent(classId, sectionId, { name, roll_no: rollNo });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setName("");
    setRollNo("");
    onClose();
    onAdded();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add student">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <Input
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          required
        />
        <Input
          label="Roll number"
          value={rollNo}
          onChange={(event) => setRollNo(event.target.value)}
          required
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
