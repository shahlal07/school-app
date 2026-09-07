import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createFeeRecord, updateFeeStatus } from "./actions";

export default async function ClerkFeesPage() {
  await requireRole("clerk");
  const supabase = createClient();
  const [{ data: students }, { data: fees }] = await Promise.all([
    supabase.from("students").select("id,name,roll_no").eq("is_active", true).order("roll_no"),
    supabase.from("fee_records").select("id,student_id,amount,due_date,status,paid_at").order("due_date", { ascending: true })
  ]);
  const names = new Map((students ?? []).map((s) => [s.id, `${s.roll_no} · ${s.name}`]));
  return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">Fees</h1><p className="mt-1 text-sm text-neutral-500">Record dues and keep payment status current.</p>
    <form action={createFeeRecord} className="mt-5 grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-[1fr_140px_160px_auto]"><select name="student_id" required className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Select student</option>{(students ?? []).map(s=><option key={s.id} value={s.id}>{s.roll_no} · {s.name}</option>)}</select><input name="amount" required min="0" step="0.01" type="number" placeholder="Amount" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><input name="due_date" required type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Add</button></form>
    <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200"><table className="min-w-full text-sm"><thead className="border-b bg-neutral-50 text-left text-neutral-500"><tr><th className="p-3">Student</th><th className="p-3">Amount</th><th className="p-3">Due</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{(fees ?? []).map(f=><tr key={f.id} className="border-b last:border-0"><td className="p-3">{names.get(f.student_id) ?? f.student_id}</td><td className="p-3">{Number(f.amount).toFixed(2)}</td><td className="p-3">{f.due_date}</td><td className="p-3 capitalize">{f.status}</td><td className="p-3"><form action={updateFeeStatus} className="flex gap-2"><input type="hidden" name="id" value={f.id}/><select name="status" defaultValue={f.status} className="rounded border border-neutral-300 px-2 py-1"><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select><button className="rounded bg-neutral-100 px-2 py-1 font-medium">Update</button></form></td></tr>)}</tbody></table></div>
  </main>;
}
