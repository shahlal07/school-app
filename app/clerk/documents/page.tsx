import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createDocument, updateDocumentStatus } from "./actions";

export default async function ClerkDocumentsPage() {
  await requireRole("clerk");
  const supabase = createClient();
  const [{ data: students }, { data: documents }] = await Promise.all([
    supabase.from("students").select("id,name,roll_no").eq("is_active", true).order("roll_no"),
    supabase.from("student_documents").select("id,student_id,document_type,status,uploaded_at,notes").order("uploaded_at", { ascending: false })
  ]);
  const names = new Map((students ?? []).map((s) => [s.id, `${s.roll_no} · ${s.name}`]));
  return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">Student Documents</h1><p className="mt-1 text-sm text-neutral-500">Track required documents and verification status.</p>
    <form action={createDocument} className="mt-5 grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><select name="student_id" required className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Select student</option>{(students ?? []).map(s=><option key={s.id} value={s.id}>{s.roll_no} · {s.name}</option>)}</select><input name="document_type" required placeholder="Document type" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><input name="notes" placeholder="Notes (optional)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Add</button></form>
    <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200"><table className="min-w-full text-sm"><thead className="border-b bg-neutral-50 text-left text-neutral-500"><tr><th className="p-3">Student</th><th className="p-3">Document</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{(documents ?? []).map(d=><tr key={d.id} className="border-b last:border-0"><td className="p-3">{names.get(d.student_id) ?? d.student_id}</td><td className="p-3">{d.document_type}</td><td className="p-3 capitalize">{d.status}</td><td className="p-3"><form action={updateDocumentStatus} className="flex gap-2"><input type="hidden" name="id" value={d.id}/><select name="status" defaultValue={d.status} className="rounded border border-neutral-300 px-2 py-1"><option value="pending">Pending</option><option value="received">Received</option><option value="verified">Verified</option></select><button className="rounded bg-neutral-100 px-2 py-1 font-medium">Update</button></form></td></tr>)}</tbody></table></div>
  </main>;
}
