"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function createFeeRecord(formData: FormData) {
  const profile = await requireRole("clerk");
  const supabase = createClient();
  const studentId = String(formData.get("student_id") ?? "");
  const amount = Number(formData.get("amount"));
  const dueDate = String(formData.get("due_date") ?? "");
  if (!studentId || !Number.isFinite(amount) || amount < 0 || !dueDate) return { error: "Student, amount and due date are required." };
  const { error } = await supabase.from("fee_records").insert({ student_id: studentId, amount, due_date: dueDate, status: "pending", recorded_by: profile.user_id });
  if (error) return { error: error.message };
  revalidatePath("/clerk/fees");
  return { error: null };
}

export async function updateFeeStatus(formData: FormData) {
  const profile = await requireRole("clerk");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["pending", "paid", "overdue"].includes(status)) return { error: "Invalid status." };
  const { error } = await createClient().from("fee_records").update({ status, paid_at: status === "paid" ? new Date().toISOString() : null, recorded_by: profile.user_id }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clerk/fees");
  return { error: null };
}
