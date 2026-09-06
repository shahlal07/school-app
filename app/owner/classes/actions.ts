"use server";

import { revalidatePath } from "next/cache";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * The set of roles allowed to assign/change/remove a homeroom (class)
 * teacher - mirrors the class_teachers RLS policy's INSERT/UPDATE/DELETE
 * check (is_owner() OR is_principal() OR is_academic_coordinator()) exactly.
 * Everyone authenticated can already SELECT class_teachers via the open
 * read policy, so no read-side guard is needed here.
 */
const CLASS_TEACHER_ASSIGNERS = ["owner", "principal", "academic_coordinator"] as const;

/**
 * Assigns (or reassigns) the homeroom teacher for one class+section.
 * Uses upsert on the (class_id, section_id) unique constraint rather than a
 * manual select-then-insert-or-update - it's a single round trip and avoids
 * a race between the existence check and the write.
 */
export async function assignClassTeacher(
  classId: string,
  sectionId: string,
  teacherId: string
): Promise<{ error: string | null }> {
  const actor = await requireAnyRole([...CLASS_TEACHER_ASSIGNERS]);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("class_teachers")
    .upsert(
      { class_id: classId, section_id: sectionId, teacher_id: teacherId },
      { onConflict: "class_id,section_id" }
    )
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    actorId: actor.user_id,
    action: "class_teacher_assigned",
    entityType: "class_teachers",
    entityId: data.id,
    newData: { class_id: classId, section_id: sectionId, teacher_id: teacherId }
  });

  revalidatePath("/owner/classes");
  return { error: null };
}

export async function removeClassTeacher(
  classId: string,
  sectionId: string
): Promise<{ error: string | null }> {
  const actor = await requireAnyRole([...CLASS_TEACHER_ASSIGNERS]);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("class_teachers")
    .delete()
    .eq("class_id", classId)
    .eq("section_id", sectionId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (data) {
    await logAudit({
      actorId: actor.user_id,
      action: "class_teacher_removed",
      entityType: "class_teachers",
      entityId: data.id,
      oldData: { class_id: classId, section_id: sectionId }
    });
  }

  revalidatePath("/owner/classes");
  return { error: null };
}
