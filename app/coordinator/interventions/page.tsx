import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createIntervention } from "./actions";
import { InterventionStatusForm } from "@/components/examination/intervention-status-form";
import { AttendanceInterventionRecommendations } from "./attendance-recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export default async function CoordinatorInterventionsPage(){
  const profile=await requireAnyRole(["owner","academic_coordinator"]);
  const canManage=profile.role==="academic_coordinator";
  const supabase=createClient();
  const t=await getT();
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

  const interventionStatusLabel:Record<string,string>={open:t("coordinator.interventions.statusOpen"),in_progress:t("coordinator.interventions.statusInProgress"),completed:t("status.completed"),cancelled:t("status.cancelled")};
  return <main className="flex flex-col gap-5 p-4 sm:p-6">
    <div><h1 className="text-xl font-semibold text-neutral-900">{t("coordinator.interventions.title")}</h1><p className="mt-1 text-sm text-neutral-500">{t("coordinator.interventions.subtitle")}</p></div>
    <AttendanceInterventionRecommendations canManage={canManage} />
    {canManage&&<Card><CardHeader><CardTitle>{t("coordinator.interventions.createIntervention")}</CardTitle></CardHeader><CardContent><form action={submitIntervention} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">{t("coordinator.interventions.student")}<select name="studentId" required className="mt-1 w-full rounded-xl border border-neutral-200 p-2">{students.map(s=><option key={s.id} value={s.id}>{s.name} — #{s.roll_no}</option>)}</select></label>
      <label className="text-sm">{t("coordinator.interventions.subject")}<select name="subjectId" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"><option value="">{t("coordinator.fallback.general")}</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-sm">{t("coordinator.interventions.assignedTeacher")}<select name="assignedTo" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"><option value="">{t("coordinator.fallback.unassigned")}</option>{teachers.map(tc=><option key={tc.user_id} value={tc.user_id}>{tc.full_name}</option>)}</select></label>
      <label className="text-sm">{t("coordinator.interventions.dueDate")}<input name="dueDate" type="date" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <label className="text-sm">{t("coordinator.interventions.followUpDate")}<input name="followUpDate" type="date" className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <label className="text-sm sm:col-span-2">{t("coordinator.interventions.action")}<input name="action" required placeholder={t("coordinator.interventions.actionPlaceholder")} className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <label className="text-sm sm:col-span-2">{t("coordinator.interventions.notes")}<textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-neutral-200 p-2"/></label>
      <button type="submit" className="w-fit rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">{t("coordinator.interventions.assignIntervention")}</button>
    </form></CardContent></Card>}
    <Card><CardHeader><CardTitle>{t("coordinator.interventions.activeAndCompleted")}</CardTitle></CardHeader><CardContent>{interventions.length===0?<p className="text-sm text-neutral-500">{t("coordinator.interventions.noInterventionsYet")}</p>:<div className="flex flex-col gap-3">{interventions.map(i=><div key={i.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-neutral-900"><Bdi>{studentMap.get(i.student_id)?.name??t("coordinator.fallback.unknownStudent")}</Bdi></p><p className="text-xs text-neutral-500"><Bdi>{subjectMap.get(i.subject_id??"")?.name??t("coordinator.fallback.general")}</Bdi> · <Bdi>{teacherMap.get(i.assigned_to??"")?.full_name??t("coordinator.fallback.unassigned")}</Bdi>{i.due_date?<> · {t("coordinator.interventions.dueWord")} <Bdi>{i.due_date}</Bdi></>:""}{i.follow_up_date?<> · {t("coordinator.interventions.followUpWord")} <Bdi>{i.follow_up_date}</Bdi></>:""}</p></div><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium">{interventionStatusLabel[i.status]??i.status}</span></div><p className="mt-2 text-sm text-neutral-700"><Bdi>{i.action}</Bdi></p>{i.notes&&<p className="mt-1 text-xs text-neutral-500"><Bdi>{i.notes}</Bdi></p>}{canManage&&<div className="mt-2"><InterventionStatusForm id={i.id} status={i.status} outcome={i.outcome}/></div>}</div>)}</div>}</CardContent></Card>
  </main>;
}
