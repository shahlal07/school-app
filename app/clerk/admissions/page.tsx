import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdmission, updateAdmissionStatus } from "./actions";

export default async function ClerkAdmissionsPage() {
  await requireRole("clerk");
  const supabase = createClient();
  const [{ data: classes }, { data: admissions }] = await Promise.all([
    supabase.from("classes").select("id,name").order("name"),
    supabase.from("admissions").select("id,student_name,class_id,status,applied_at,notes").order("applied_at", { ascending: false })
  ]);
  const classNames = new Map((classes ?? []).map((c) => [c.id, c.name]));
  return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">Admissions</h1><p className="mt-1 text-sm text-neutral-500">Track inquiries and admission processing separately from enrolled students.</p>
    <form action={createAdmission} className="mt-5 grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><input name="student_name" required placeholder="Applicant name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><select name="class_id" required className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Target class</option>{(classes ?? []).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input name="notes" placeholder="Notes (optional)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Add</button></form>
    <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200"><table className="min-w-full text-sm"><thead className="border-b bg-neutral-50 text-left text-neutral-500"><tr><th className="p-3">Applicant</th><th className="p-3">Class</th><th className="p-3">Applied</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{(admissions ?? []).map(a=><tr key={a.id} className="border-b last:border-0"><td className="p-3 font-medium">{a.student_name}</td><td className="p-3">{classNames.get(a.class_id) ?? "—"}</td><td className="p-3">{a.applied_at.slice(0,10)}</td><td className="p-3 capitalize">{a.status}</td><td className="p-3"><form action={updateAdmissionStatus} className="flex gap-2"><input type="hidden" name="id" value={a.id}/><select name="status" defaultValue={a.status} className="rounded border border-neutral-300 px-2 py-1"><option value="inquiry">Inquiry</option><option value="pending">Pending</option><option value="enrolled">Enrolled</option><option value="rejected">Rejected</option></select><button className="rounded bg-neutral-100 px-2 py-1 font-medium">Update</button></form></td></tr>)}</tbody></table></div>
  </main>;
}
