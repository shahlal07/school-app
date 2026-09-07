import { createClient } from "@/lib/supabase/server";

function pakistanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function getClerkOperationalSummary() {
  const supabase = createClient();
  const today = pakistanDate();
  const monthStart = `${today.slice(0, 7)}-01T00:00:00+05:00`;
  const [documents, admissions, fees, recentDocuments, recentAdmissions, recentFees] = await Promise.all([
    supabase.from("student_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("admissions").select("id", { count: "exact", head: true }).in("status", ["inquiry", "pending"]).gte("applied_at", monthStart),
    supabase.from("fee_records").select("id", { count: "exact", head: true }).in("status", ["pending", "overdue"]),
    supabase.from("student_documents").select("id,student_id,document_type,status,uploaded_at").in("status", ["pending", "received"]).order("uploaded_at", { ascending: true }).limit(4),
    supabase.from("admissions").select("id,student_name,status,applied_at").in("status", ["inquiry", "pending"]).order("applied_at", { ascending: true }).limit(4),
    supabase.from("fee_records").select("id,student_id,amount,due_date,status").in("status", ["pending", "overdue"]).order("due_date", { ascending: true }).limit(4)
  ]);
  return {
    counts: { pendingDocuments: documents.count ?? 0, pendingAdmissionsThisMonth: admissions.count ?? 0, pendingOrOverdueFees: fees.count ?? 0 },
    tasks: { documents: recentDocuments.data ?? [], admissions: recentAdmissions.data ?? [], fees: recentFees.data ?? [] }
  };
}
