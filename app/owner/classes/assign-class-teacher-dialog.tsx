"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/types/database";

import { assignClassTeacher, removeClassTeacher } from "./actions";

const selectClasses =
  "h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500";

export interface ClassSectionTarget {
  classId: string;
  sectionId: string;
  classLabel: string;
  currentTeacherId: string | null;
}

interface AssignClassTeacherDialogProps {
  target: ClassSectionTarget | null;
  teachers: Profile[];
  onClose: () => void;
  onChanged: () => void;
}

export function AssignClassTeacherDialog({
  target,
  teachers,
  onClose,
  onChanged
}: AssignClassTeacherDialogProps) {
  const { toast } = useToast();
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function resetAndClose() {
    setSelectedTeacherId("");
    onClose();
  }

  async function handleAssign() {
    if (!target || !selectedTeacherId) return;
    setSaving(true);
    const result = await assignClassTeacher(target.classId, target.sectionId, selectedTeacherId);
    setSaving(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast("Class teacher assigned", "success");
    setSelectedTeacherId("");
    onChanged();
  }

  async function handleRemove() {
    if (!target) return;
    setRemoving(true);
    const result = await removeClassTeacher(target.classId, target.sectionId);
    setRemoving(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast("Class teacher removed", "success");
    onChanged();
  }

  return (
    <Dialog
      open={!!target}
      onClose={resetAndClose}
      title={`Class teacher for ${target?.classLabel ?? ""}`}
      description="This teacher will be shown as the homeroom / class teacher for this section."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="assign-class-teacher">
            Teacher
          </label>
          <select
            id="assign-class-teacher"
            value={selectedTeacherId}
            onChange={(event) => setSelectedTeacherId(event.target.value)}
            className={selectClasses}
          >
            <option value="">Select a teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.user_id} value={teacher.user_id}>
                {teacher.full_name}
                {teacher.user_id === target?.currentTeacherId ? " (current)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {target?.currentTeacherId ? (
            <Button variant="destructive" size="sm" loading={removing} onClick={handleRemove}>
              Remove class teacher
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAssign} loading={saving} disabled={!selectedTeacherId}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
