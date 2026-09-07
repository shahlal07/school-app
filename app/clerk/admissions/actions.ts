"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["inquiry", "pending", "enrolled", "rejected"]);

export async function createAdmission(formData: FormData) {
  const profile = await requireRole("clerk");
  const supabase = createClient();
  const studentName = String(formData.get("student_name") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "");
  if (!studentName || !classId) return { error: "Student name and class are required." };
  const { error } = await supabase.from("admissions").insert({ student_name: studentName, class_id: classId, status: "inquiry", processed_by: profile.user_id, notes: String(formData.get("notes") ?? "").trim() || null });
  if (error) return { error: error.message };
  revalidatePath("/clerk/admissions");
  return { error: null };
}

export async function updateAdmissionStatus(formData: FormData) {
  const profile = await requireRole("clerk");
  const status = String(formData.get("status") ?? "");
  if (!allowed.has(status)) return { error: "Invalid status." };
  const supabase = createClient();
  const { error } = await supabase.from("admissions").update({ status, processed_by: profile.user_id }).eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: error.message };
  revalidatePath("/clerk/admissions");
  return { error: null };
}
