"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";

type ActionResult = { error: string | null };

const SYLLABUS_PATH = "/owner/syllabus";

/* ------------------------------------------------------------------ */
/* Subjects                                                           */
/* ------------------------------------------------------------------ */

export async function updateSubject(
  subjectId: string,
  updates: { name?: string; is_active?: boolean }
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const trimmedName = updates.name?.trim();
  if (updates.name !== undefined && !trimmedName) {
    return { error: t("owner.syllabus.subjectNameEmpty") };
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {})
    })
    .eq("id", subjectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function deleteSubject(subjectId: string): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* Chapters                                                            */
/* ------------------------------------------------------------------ */

export async function createChapter(
  subjectId: string,
  input: { name: string; description?: string }
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const name = input.name.trim();
  if (!name) {
    return { error: t("owner.syllabus.chapterNameEmpty") };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("chapters")
    .select("order_index")
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (fetchError) {
    return { error: fetchError.message };
  }

  const nextOrderIndex =
    existing && existing.length > 0 ? (existing[0].order_index as number) + 1 : 0;

  const { error } = await supabase.from("chapters").insert({
    subject_id: subjectId,
    name,
    description: input.description?.trim() || null,
    order_index: nextOrderIndex
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function updateChapter(
  chapterId: string,
  updates: { name?: string; description?: string | null }
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const trimmedName = updates.name?.trim();
  if (updates.name !== undefined && !trimmedName) {
    return { error: t("owner.syllabus.chapterNameEmpty") };
  }

  const { error } = await supabase
    .from("chapters")
    .update({
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      ...(updates.description !== undefined
        ? { description: updates.description?.trim() || null }
        : {})
    })
    .eq("id", chapterId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function deleteChapter(chapterId: string): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();

  const { error } = await supabase.from("chapters").delete().eq("id", chapterId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function reorderChapter(
  chapterId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id, subject_id, order_index")
    .eq("id", chapterId)
    .single();

  if (chapterError || !chapter) {
    return { error: chapterError?.message ?? t("owner.syllabus.chapterNotFound") };
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from("chapters")
    .select("id, order_index")
    .eq("subject_id", chapter.subject_id)
    .order("order_index", { ascending: true });

  if (siblingsError || !siblings) {
    return { error: siblingsError?.message ?? t("owner.syllabus.unableToLoadChapters") };
  }

  const index = siblings.findIndex((c) => c.id === chapterId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
    return { error: null };
  }

  const current = siblings[index];
  const neighbor = siblings[swapIndex];

  const result = await swapOrderIndex(
    supabase,
    "chapters",
    current.id,
    current.order_index,
    neighbor.id,
    neighbor.order_index
  );

  if (result.error) {
    return result;
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* Topics                                                              */
/* ------------------------------------------------------------------ */

export async function createTopic(
  chapterId: string,
  input: { name: string; description?: string }
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const name = input.name.trim();
  if (!name) {
    return { error: t("owner.syllabus.topicNameEmpty") };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("topics")
    .select("order_index")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (fetchError) {
    return { error: fetchError.message };
  }

  const nextOrderIndex =
    existing && existing.length > 0 ? (existing[0].order_index as number) + 1 : 0;

  const { error } = await supabase.from("topics").insert({
    chapter_id: chapterId,
    name,
    description: input.description?.trim() || null,
    order_index: nextOrderIndex
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function updateTopic(
  topicId: string,
  updates: { name?: string; description?: string | null }
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const trimmedName = updates.name?.trim();
  if (updates.name !== undefined && !trimmedName) {
    return { error: t("owner.syllabus.topicNameEmpty") };
  }

  const { error } = await supabase
    .from("topics")
    .update({
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      ...(updates.description !== undefined
        ? { description: updates.description?.trim() || null }
        : {})
    })
    .eq("id", topicId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function deleteTopic(topicId: string): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();

  const { error } = await supabase.from("topics").delete().eq("id", topicId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

export async function reorderTopic(
  topicId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  await requireRole("academic_coordinator");
  const supabase = createClient();
  const t = await getT();

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, chapter_id, order_index")
    .eq("id", topicId)
    .single();

  if (topicError || !topic) {
    return { error: topicError?.message ?? t("owner.syllabus.topicNotFound") };
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from("topics")
    .select("id, order_index")
    .eq("chapter_id", topic.chapter_id)
    .order("order_index", { ascending: true });

  if (siblingsError || !siblings) {
    return { error: siblingsError?.message ?? t("owner.syllabus.unableToLoadTopics") };
  }

  const index = siblings.findIndex((t) => t.id === topicId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
    return { error: null };
  }

  const current = siblings[index];
  const neighbor = siblings[swapIndex];

  const result = await swapOrderIndex(
    supabase,
    "topics",
    current.id,
    current.order_index,
    neighbor.id,
    neighbor.order_index
  );

  if (result.error) {
    return result;
  }

  revalidatePath(SYLLABUS_PATH);
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Swaps `order_index` between two rows in the same table. Routed through a
 * temporary negative value first in case a (parent_id, order_index) unique
 * constraint exists on the table - two direct concurrent updates could
 * otherwise collide on the intermediate state.
 */
async function swapOrderIndex(
  supabase: ReturnType<typeof createClient>,
  table: "chapters" | "topics",
  firstId: string,
  firstOrderIndex: number,
  secondId: string,
  secondOrderIndex: number
): Promise<ActionResult> {
  const tempOrderIndex = -1;

  const { error: firstError } = await supabase
    .from(table)
    .update({ order_index: tempOrderIndex })
    .eq("id", firstId);

  if (firstError) {
    return { error: firstError.message };
  }

  const { error: secondError } = await supabase
    .from(table)
    .update({ order_index: firstOrderIndex })
    .eq("id", secondId);

  if (secondError) {
    return { error: secondError.message };
  }

  const { error: thirdError } = await supabase
    .from(table)
    .update({ order_index: secondOrderIndex })
    .eq("id", firstId);

  if (thirdError) {
    return { error: thirdError.message };
  }

  return { error: null };
}
