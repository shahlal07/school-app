import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { finalizeResult, rejectResult } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CoordinatorResultsPage(){
  await requireRole("academic_coordinator"); const supabase=createClient();
  const [submissionsRes,schedulesRes,teachersRes]=await Promise.all([
    supabase.from('result_submissions').select('id,schedule_item_id,teacher_id,status,submitted_at,review_notes').order('created_at',{ascending:false}),
    supabase.from('schedule_items').select('id,title,scheduled_date,class_id,subject_id'),
    supabase.from('profiles').select('user_id,full_name').eq('role','teacher')
  ]);
  const submissions=(submissionsRes.data as {id:string;schedule_item_id:string;teacher_id:string;status:string;submitted_at:string|null;review_notes:string|null}[]|null)??[];
  const schedules=(schedulesRes.data as {id:string;title:string;scheduled_date:string}[]|null)??[];
  const teachers=(teachersRes.data as {user_id:string;full_name:string}[]|null)??[];
  const scheduleMap=new Map(schedules.map(s=>[s.id,s])); const teacherMap=new Map(teachers.map(t=>[t.user_id,t]));
  const pipeline={draft:submissions.filter(s=>s.status==='draft').length,submitted:submissions.filter(s=>s.status==='submitted').length,reviewed:submissions.filter(s=>s.status==='reviewed').length,finalized:submissions.filter(s=>s.status==='finalized').length,rejected:submissions.filter(s=>s.status==='rejected').length};
  return <main className="flex flex-col gap-5 p-4 sm:p-6"><div><h1 className="text-xl font-semibold text-neutral-900">Results pipeline</h1><p className="mt-1 text-sm text-neutral-500">Draft → teacher submitted → coordinator reviewed → finalized. Finalized rows are locked in the database.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries(pipeline).map(([key,value])=><Card key={key}><CardContent className="py-4"><p className="text-2xl font-semibold text-neutral-900">{value}</p><p className="text-xs capitalize text-neutral-500">{key}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Submission queue</CardTitle></CardHeader><CardContent>{submissions.length===0?<p className="text-sm text-neutral-500">No result submissions yet. Teachers can submit a completed roster from each exam.</p>:<div className="flex flex-col gap-2">{submissions.map(s=>{const item=scheduleMap.get(s.schedule_item_id);return <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-neutral-900">{item?.title??'Unknown exam'}</p><p className="text-xs text-neutral-500">{teacherMap.get(s.teacher_id)?.full_name??'Unknown teacher'} · {item?.scheduled_date??''} · {s.status}</p>{s.review_notes&&<p className="mt-1 text-xs text-neutral-600">{s.review_notes}</p>}</div>{s.status==='submitted'&&<div className="flex gap-2"><form action={async()=>{'use server';await finalizeResult(s.id)}}><button className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white">Finalize</button></form><form action={async()=>{'use server';await rejectResult(s.id,'Please correct and resubmit the result roster.')}}><button className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900">Reject</button></form></div>}</div>})}</div>}</CardContent></Card>
  </main>;
}
