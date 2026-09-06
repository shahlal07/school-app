"use server";

import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getReviewPaperUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  await requireAnyRole(["owner", "academic_coordinator"]);
  if (!path) return { url: null, error: "Paper file is missing." };
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("exam-papers").createSignedUrl(path, 300);
  return error ? { url: null, error: error.message } : { url: data.signedUrl, error: null };
}
