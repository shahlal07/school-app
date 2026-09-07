"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["pending", "received", "verified"]);

export async function createDocument(formData: FormData): Promise<void> {
  const profile = await requireRole("clerk");
  const supabase = createClient();
  const studentId = String(formData.get("student_id") ?? "");
  const documentType = String(formData.get("document_type") ?? "").trim();
  if (!studentId || !documentType) throw new Error("Student and document type are required.");
  const { error } = await supabase.from("student_documents").insert({ student_id: studentId, document_type: documentType, uploaded_by: profile.user_id, notes: String(formData.get("notes") ?? "").trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath("/clerk/documents");
}

export async function updateDocumentStatus(formData: FormData): Promise<void> {
  const profile = await requireRole("clerk");
  const status = String(formData.get("status") ?? "");
  if (!allowed.has(status)) throw new Error("Invalid status.");
  const supabase = createClient();
  const { error } = await supabase.from("student_documents").update({ status }).eq("id", String(formData.get("id") ?? ""));
  if (error) throw new Error(error.message);
  revalidatePath("/clerk/documents");
  void profile;
}
