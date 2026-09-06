import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export default async function OwnerInterventionsPage(){
  await requireRole("owner"); const supabase=createClient();
  const t=await getT();
  const {data}=await supabase.from("academic_interventions").select("id,student_id,subject_id,assigned_to,action,notes,due_date,status,outcome,created_at").order("created_at",{ascending:false});
  const rows=(data as {id:string;student_id:string;subject_id:string|null;assigned_to:string|null;action:string;notes:string|null;due_date:string|null;status:string;outcome:string|null}[]|null)??[];
  return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">{t("owner.interventions.title")}</h1><p className="mt-1 text-sm text-neutral-500">{t("owner.interventions.subtitle")}</p><div className="mt-5"><Card><CardHeader><CardTitle>{t("owner.interventions.registerTitle")}</CardTitle></CardHeader><CardContent>{rows.length===0?<p className="text-sm text-neutral-500">{t("owner.interventions.noInterventions")}</p>:<div className="flex flex-col gap-2">{rows.map(r=><div key={r.id} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-neutral-900"><Bdi>{r.action}</Bdi></p><span className="rounded-full bg-white px-2 py-1 text-xs"><Bdi>{r.status}</Bdi></span></div><p className="mt-1 text-xs text-neutral-500">{t("owner.interventions.studentRecord")} · {r.due_date?<>{t("owner.interventions.due")} <Bdi>{r.due_date}</Bdi></>:t("owner.interventions.noDueDate")}</p>{r.outcome&&<p className="mt-1 text-xs text-neutral-600">{t("owner.interventions.outcomeLabel")} <Bdi>{r.outcome}</Bdi></p>}</div>)}</div>}</CardContent></Card></div></main>;
}
