"use client";

import { FormEvent, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { Profile } from "@/types/database";

import { inviteTeacher, setTeacherActive } from "./actions";

function TeachersInner({ teachers }: { teachers: Profile[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await inviteTeacher(fullName, email);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast(`Invited ${fullName}`, "success");
    setOpen(false);
    setFullName("");
    setEmail("");
  }

  async function handleToggleActive(teacher: Profile) {
    const result = await setTeacherActive(teacher.user_id, !teacher.is_active);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast(
      teacher.is_active ? `Deactivated ${teacher.full_name}` : `Reactivated ${teacher.full_name}`,
      "success"
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-neutral-900">Teachers</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          Invite teacher
        </Button>
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          title="No teachers yet"
          description="Invite your first teacher to get started."
          actionLabel="Invite teacher"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader className="flex flex-row items-center gap-3">
                <Avatar name={teacher.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{teacher.full_name}</CardTitle>
                  <Badge variant={teacher.is_active ? "success" : "neutral"} className="mt-1">
                    {teacher.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant={teacher.is_active ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => handleToggleActive(teacher)}
                >
                  {teacher.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a teacher"
        description="They'll receive an email invite to set their own password."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          )}
          <Input
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send invite
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function TeachersClient({ teachers }: { teachers: Profile[] }) {
  return (
    <ToastProvider>
      <TeachersInner teachers={teachers} />
    </ToastProvider>
  );
}
