"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { Profile } from "@/types/database";

import { updateStaffRecordFields } from "./actions";

function EditStaffRecordDialog({
  teacher,
  onClose,
  onSaved
}: {
  teacher: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [designation, setDesignation] = useState(teacher?.designation ?? "");
  const [joiningDate, setJoiningDate] = useState(teacher?.joining_date ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teacher) return;
    setError(null);
    setSubmitting(true);

    const result = await updateStaffRecordFields(
      teacher.user_id,
      designation.trim() || null,
      joiningDate || null
    );

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
  }

  return (
    <Dialog
      key={teacher?.id ?? "none"}
      open={!!teacher}
      onClose={onClose}
      title={`Edit staff record for ${teacher?.full_name ?? ""}`}
      description="Sets designation and joining date via the set_staff_record_fields function."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <Input
          label="Designation"
          value={designation}
          onChange={(event) => setDesignation(event.target.value)}
          placeholder="e.g. Senior Teacher, Head of Science"
          autoFocus
        />
        <Input
          label="Joining date"
          type="date"
          value={joiningDate ?? ""}
          onChange={(event) => setJoiningDate(event.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

interface StaffListClientProps {
  teachers: Profile[];
}

function StaffListInner({ teachers }: StaffListClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingTeacher, setEditingTeacher] = useState<Profile | null>(null);

  return (
    <div>
      {teachers.length === 0 ? (
        <EmptyState
          title="No teaching staff yet"
          description="Teacher accounts are created by the owner from Owner > Teachers."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader className="flex flex-row items-center gap-3">
                <Avatar name={teacher.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{teacher.full_name}</CardTitle>
                  {teacher.username && (
                    <p className="truncate text-xs text-neutral-500">@{teacher.username}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={teacher.is_active ? "success" : "neutral"}>
                      {teacher.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-neutral-500">Designation</dt>
                  <dd className="text-neutral-900">{teacher.designation ?? "—"}</dd>
                  <dt className="text-neutral-500">Joining date</dt>
                  <dd className="text-neutral-900">{teacher.joining_date ?? "—"}</dd>
                </dl>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditingTeacher(teacher)}
                >
                  Edit record
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditStaffRecordDialog
        teacher={editingTeacher}
        onClose={() => setEditingTeacher(null)}
        onSaved={() => {
          setEditingTeacher(null);
          toast("Staff record updated", "success");
          router.refresh();
        }}
      />
    </div>
  );
}

export function StaffListClient(props: StaffListClientProps) {
  return (
    <ToastProvider>
      <StaffListInner {...props} />
    </ToastProvider>
  );
}
