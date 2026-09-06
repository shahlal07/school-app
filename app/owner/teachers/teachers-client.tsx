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
import type { Profile, StaffRole } from "@/types/database";
import type { Class, Subject } from "@/types/examination";
import { STAFF_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Bdi } from "@/components/shared/bdi";

import { createTeacherAccount, resetTeacherPassword, setTeacherActive } from "./actions";
import { AssignSubjectsDialog, type TeacherAssignmentRow } from "./assign-subjects-dialog";

const selectClasses =
  "h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500";

function CreateTeacherDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (fullName: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("teacher");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  function reset() {
    setFullName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setRole("teacher");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("owner.teachers.passwordsDontMatch"));
      return;
    }

    setSubmitting(true);
    const result = await createTeacherAccount(fullName, username, password, role);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onCreated(fullName);
    reset();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("owner.teachers.createAccountTitle")}
      description={t("owner.teachers.createAccountDescription")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <Input
          label={t("owner.teachers.fullName")}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoFocus
          required
        />
        <Input
          label={t("owner.teachers.username")}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          placeholder={t("owner.teachers.usernamePlaceholder")}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700" htmlFor="create-role">
            {t("owner.teachers.role")}
          </label>
          <select
            id="create-role"
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole)}
            className={selectClasses}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Input
          label={t("owner.teachers.password")}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label={t("owner.teachers.confirmPassword")}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={submitting}>
            {t("owner.teachers.createAccount")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({
  teacher,
  onClose,
  onReset
}: {
  teacher: Profile | null;
  onClose: () => void;
  onReset: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teacher) return;
    setError(null);

    if (password !== confirmPassword) {
      setError(t("owner.teachers.passwordsDontMatch"));
      return;
    }

    setSubmitting(true);
    const result = await resetTeacherPassword(teacher.user_id, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    onReset();
  }

  return (
    <Dialog
      open={!!teacher}
      onClose={onClose}
      title={`${t("owner.teachers.resetPasswordForPrefix")} ${teacher?.full_name ?? ""}`}
      description={t("owner.teachers.resetPasswordDescription")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <Input
          label={t("owner.teachers.newPassword")}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          autoFocus
          required
        />
        <Input
          label={t("owner.teachers.confirmNewPassword")}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={submitting}>
            {t("owner.teachers.resetPassword")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

interface TeachersClientProps {
  teachers: Profile[];
  classes: Class[];
  subjectsByClass: Record<string, Subject[]>;
  assignments: TeacherAssignmentRow[];
}

function TeachersInner({ teachers, classes, subjectsByClass, assignments }: TeachersClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [resettingTeacher, setResettingTeacher] = useState<Profile | null>(null);
  const [assigningTeacher, setAssigningTeacher] = useState<Profile | null>(null);

  async function handleToggleActive(teacher: Profile) {
    const result = await setTeacherActive(teacher.user_id, !teacher.is_active);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    toast(
      `${teacher.is_active ? t("owner.teachers.deactivated") : t("owner.teachers.reactivated")} ${teacher.full_name}`,
      "success"
    );
  }

  function assignmentCount(teacher: Profile): number {
    return assignments.filter((a) => a.teacher_id === teacher.user_id).length;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-neutral-900">{t("nav.staff")}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {t("owner.teachers.createAccount")}
        </Button>
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          title={t("owner.teachers.noStaffYet")}
          description={t("owner.teachers.noStaffYetDescription")}
          actionLabel={t("owner.teachers.createAccount")}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => {
            const count = assignmentCount(teacher);
            return (
              <Card key={teacher.id}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar name={teacher.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate"><Bdi>{teacher.full_name}</Bdi></CardTitle>
                    {teacher.username && (
                      <p className="truncate text-xs text-neutral-500">@<Bdi>{teacher.username}</Bdi></p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant={teacher.is_active ? "success" : "neutral"}>
                        {teacher.is_active ? t("status.active") : t("owner.teachers.inactive")}
                      </Badge>
                      <Badge variant="neutral">{ROLE_LABELS[teacher.role]}</Badge>
                      {teacher.role === "teacher" && (
                        <Badge variant={count > 0 ? "info" : "warning"}>
                          <Bdi>{count}</Bdi> {count === 1 ? t("owner.reports.subjectSingular") : t("owner.reports.subjectsSuffix")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {teacher.role === "teacher" && (
                    <Button variant="secondary" size="sm" onClick={() => setAssigningTeacher(teacher)}>
                      {t("owner.teachers.assignSubjects")}
                    </Button>
                  )}
                  <Button
                    variant={teacher.is_active ? "destructive" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleActive(teacher)}
                  >
                    {teacher.is_active ? t("owner.teachers.deactivate") : t("owner.teachers.reactivate")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setResettingTeacher(teacher)}>
                    {t("owner.teachers.resetPassword")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTeacherDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(fullName) => {
          setCreateOpen(false);
          toast(`${fullName} ${t("owner.teachers.accountCreatedSuffix")}`, "success");
        }}
      />

      <ResetPasswordDialog
        teacher={resettingTeacher}
        onClose={() => setResettingTeacher(null)}
        onReset={() => {
          toast(t("owner.teachers.passwordResetToast"), "success");
          setResettingTeacher(null);
        }}
      />

      <AssignSubjectsDialog
        teacher={assigningTeacher}
        classes={classes}
        subjectsByClass={subjectsByClass}
        assignments={assignments}
        onClose={() => setAssigningTeacher(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}

export function TeachersClient(props: TeachersClientProps) {
  return (
    <ToastProvider>
      <TeachersInner {...props} />
    </ToastProvider>
  );
}
