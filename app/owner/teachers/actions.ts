"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { usernameToSyntheticEmail, usernameValidationError } from "@/lib/auth/username";
import { STAFF_ROLES, isStaffRole } from "@/lib/auth/roles";
import type { StaffRole } from "@/types/database";
import { getT } from "@/lib/i18n/get-translator";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Most teachers at this school have no email address, so the owner sets a
 * username + initial password directly and hands them to the teacher in
 * person - there is no email invite step. The account is created against a
 * deterministic synthetic email (see lib/auth/username.ts) purely because
 * Supabase Auth requires an email-shaped identity internally.
 */
export async function createTeacherAccount(
  fullName: string,
  username: string,
  password: string,
  role: StaffRole = "teacher"
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");
  const t = await getT();

  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return { error: t("owner.teachers.fullNameRequired") };
  }

  if (!isStaffRole(role)) {
    return { error: t("owner.teachers.invalidRole") };
  }

  const usernameError = usernameValidationError(username);
  if (usernameError) {
    return { error: usernameError };
  }
  const trimmedUsername = username.trim();

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `${t("owner.teachers.passwordMinLengthPrefix")} ${MIN_PASSWORD_LENGTH} ${t("owner.teachers.passwordMinLengthSuffix")}` };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", trimmedUsername)
    .maybeSingle();

  if (existing) {
    return { error: `${t("owner.teachers.usernameTakenPrefix")} "${trimmedUsername}" ${t("owner.teachers.usernameTakenSuffix")}` };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: usernameToSyntheticEmail(trimmedUsername),
    password,
    email_confirm: true
  });

  if (error || !data.user) {
    return { error: error?.message ?? t("owner.teachers.unableToCreateAccount") };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: data.user.id,
    full_name: trimmedName,
    role,
    is_active: true,
    username: trimmedUsername
  });

  if (profileError) {
    // Don't leave an orphaned auth user behind if the profile row fails.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return { error: profileError.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: `${role}_account_created`,
    entityType: "profiles",
    entityId: data.user.id,
    newData: { full_name: trimmedName, username: trimmedUsername, role }
  });

  revalidatePath("/owner/teachers");
  return { error: null };
}

/**
 * Assigns a teacher to one class+subject combination. This is what
 * actually makes a teacher account useful - every RLS policy scoping a
 * teacher's visibility (schedule_items, chapters, exam_papers,
 * test_results, students) reads through teacher_subjects, so an
 * unassigned teacher sees nothing anywhere in the app.
 */
export async function assignTeacherSubject(
  teacherId: string,
  subjectId: string,
  classId: string
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");
  const supabase = createClient();
  const t = await getT();

  const { data, error } = await supabase
    .from("teacher_subjects")
    .insert({ teacher_id: teacherId, subject_id: subjectId, class_id: classId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: t("owner.teachers.alreadyAssignedToSubject") };
    }
    return { error: error.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: "teacher_subject_assigned",
    entityType: "teacher_subjects",
    entityId: data.id,
    newData: { teacher_id: teacherId, subject_id: subjectId, class_id: classId }
  });

  revalidatePath("/owner/teachers");
  return { error: null };
}

export async function unassignTeacherSubject(
  assignmentId: string
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");
  const supabase = createClient();

  const { error } = await supabase.from("teacher_subjects").delete().eq("id", assignmentId);

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: "teacher_subject_unassigned",
    entityType: "teacher_subjects",
    entityId: assignmentId
  });

  revalidatePath("/owner/teachers");
  return { error: null };
}

/**
 * There is no email-based "forgot password" flow available for
 * username-only accounts, so the owner must be able to reset a teacher's
 * password directly when they forget it.
 */
export async function resetTeacherPassword(
  userId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");
  const t = await getT();

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `${t("owner.teachers.passwordMinLengthPrefix")} ${MIN_PASSWORD_LENGTH} ${t("owner.teachers.passwordMinLengthSuffix")}` };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: "teacher_password_reset",
    entityType: "profiles",
    entityId: userId
  });

  return { error: null };
}

export async function setTeacherActive(
  userId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const owner = await requireRole("owner");

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("user_id", userId)
    .neq("role", "owner");

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: owner.user_id,
    action: isActive ? "staff_reactivated" : "staff_deactivated",
    entityType: "profiles",
    entityId: userId,
    newData: { is_active: isActive }
  });

  revalidatePath("/owner/teachers");
  return { error: null };
}
