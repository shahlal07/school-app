"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { StudentImportRow } from "@/lib/utils/csv";

const STUDENTS_PATH = "/owner/students";

export async function addStudent(
  classId: string,
  sectionId: string,
  input: { name: string; roll_no: string }
): Promise<{ error: string | null }> {
  await requireRole("owner");
  const supabase = createClient();

  const name = input.name.trim();
  const rollNo = input.roll_no.trim();

  if (!name) return { error: "Name is required." };
  if (!rollNo) return { error: "Roll number is required." };

  const { error } = await supabase.from("students").insert({
    class_id: classId,
    section_id: sectionId,
    roll_no: rollNo,
    name
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Roll number "${rollNo}" already exists in this section.` };
    }
    return { error: error.message };
  }

  revalidatePath(STUDENTS_PATH);
  return { error: null };
}

export async function setStudentActive(
  studentId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  await requireRole("owner");
  const supabase = createClient();

  const { error } = await supabase
    .from("students")
    .update({ is_active: isActive })
    .eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(STUDENTS_PATH);
  return { error: null };
}

export async function deleteStudent(studentId: string): Promise<{ error: string | null }> {
  await requireRole("owner");
  const supabase = createClient();

  const { error } = await supabase.from("students").delete().eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(STUDENTS_PATH);
  return { error: null };
}

export interface ImportSummary {
  imported: number;
  skipped: { roll_no: string; reason: string }[];
}

export async function importStudents(
  classId: string,
  sectionId: string,
  rows: StudentImportRow[]
): Promise<{ error: string | null; summary?: ImportSummary }> {
  await requireRole("owner");
  const supabase = createClient();

  const skipped: { roll_no: string; reason: string }[] = [];
  let imported = 0;

  for (const row of rows) {
    const { error } = await supabase.from("students").insert({
      class_id: classId,
      section_id: sectionId,
      roll_no: row.roll_no,
      name: row.name
    });

    if (error) {
      skipped.push({
        roll_no: row.roll_no,
        reason: error.code === "23505" ? "Roll number already exists" : error.message
      });
      continue;
    }

    imported += 1;
  }

  revalidatePath(STUDENTS_PATH);
  return { error: null, summary: { imported, skipped } };
}
