import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createIntervention } from "./actions";
import { InterventionStatusForm } from "@/components/examination/intervention-status-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CoordinatorInterventionsPage(){
  const profile=await requireAnyRole(["owner","academic_coordinator"]);
  const canManage=profile.role==="academic_coordinator";
  const supabase=createClient();
  const [studentsRes,subjectsRes,teachersRes,interventionsRes]=await Promise.all([
    supabase.from("students").select("id,name,roll_no,class_id").eq("is_active",true).order("name"),
    supabase.from("subjects").select("id,name").eq("is_active",true).order("name"),
    supabase.from("profiles").select("user_id,full_name").eq("role","teacher").eq("is_active",true).order("full_name"),
    supabase.from("academic_interventions").select("id,student_id,subject_id,assigned_to,action,notes,due_date,follow_up_date,status,outcome,created_at").order("created_at",{ascending:false})
  ]);
  const students=(studentsRes.data as {id:string;name:string;roll_no:string;class_id:string}[]|null)??[];
  const subjects=(subjectsRes.data as {id:string;name:string}[]|null)??[];
  const teachers=(teachersRes.data as {user_id:string;full_name:string}[]|null)??[];
  const interventions=(interventionsRes.data as {id:string;student_id:string;subject_id:string|null;assigned_to:string|null;action:string;notes:string|null;due_date:string|null;follow_up_date:string|null;status:string;outcome:string|null;created_at:string}[]|null)??[];
  const studentMap=new Map(students.map(s=>[s.id,s]));
  const subjectMap=new Map(subjects.map(s=>[s.id,s]));
  const teacherMap=new Map(teachers.map(t=>[t.user_id,t]));
  const submitIntervention=async(formData:FormData)=>{ "use server"; await createIntervention(formData); };

  return <main className="flex flex-col gap-5 p-4 sm:p-6">
    <div><h1 className="text-xl font-semibold text-neutral-900">Intervention tracking</h1><p className="mt-1 text-sm text-neutral-500">Turn an academic warning into an assigned action, follow-up date, and measurable outcome.</p></div>
    {canManage&&<Card><CardHeader><CardTitle>Create intervention</CardTitle></CardHeader><CardContent><form action={submitIntervention} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Student<select name="studentId" required className="mt-1 w-full rounded-xl border border-neutral-200 p-2">{students.map(s=><option key={s.id} value={s.id}>{s.name} — #{s.roll_no}</option>)}</select></label>
      <label className="text-sm">Subject<select name="subjectId" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"><option value="">General</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-sm">Assigned teacher<select name="assignedTo" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"><option value="">Unassigned</option>{teachers.map(t=><option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}</select></label>
      <label className="text-sm">Due date<input name="dueDate" type="date" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <label className="text-sm">Follow-up date<input name="followUpDate" type="date" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <label className="text-sm sm:col-span-2">Action<input name="action" required placeholder="e.g. 3 targeted revision sessions" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <label className="text-sm sm:col-span-2">Notes<textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <button type="submit" className="w-fit rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Assign intervention</button>
    </form></CardContent></Card>}
    <Card><CardHeader><CardTitle>Active and completed interventions</CardTitle></CardHeader><CardContent>{interventions.length===0?<p className="text-sm text-neutral-500">No interventions have been recorded yet.</p>:<div className="flex flex-col gap-3">{interventions.map(i=><div key={i.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-neutral-900">{studentMap.get(i.student_id)?.name??"Unknown student"}</p><p className="text-xs text-neutral-500">{subjectMap.get(i.subject_id??"")?.name??"General"} · {teacherMap.get(i.assigned_to??"")?.full_name??"Unassigned"}{i.due_date?` · due ${i.due_date}`:""}{i.follow_up_date?` · follow-up ${i.follow_up_date}`:""}</p></div><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">{i.status}</span></div><p className="mt-2 text-sm text-neutral-700">{i.action}</p>{i.notes&&<p className="mt-1 text-xs text-neutral-500">{i.notes}</p>}{canManage&&<div className="mt-2"><InterventionStatusForm id={i.id} status={i.status} outcome={i.outcome}/></div>}</div>)}</div>}</CardContent></Card>
  </main>;
}
