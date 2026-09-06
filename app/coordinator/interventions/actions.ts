"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type Result={error:string|null};

export async function createIntervention(formData:FormData):Promise<Result>{
  const profile=await requireAnyRole(["owner","academic_coordinator"]); const supabase=createClient();
  const studentId=String(formData.get("studentId")??"").trim();
  const subjectId=String(formData.get("subjectId")??"").trim()||null;
  const assignedTo=String(formData.get("assignedTo")??"").trim()||null;
  const action=String(formData.get("action")??"").trim();
  const notes=String(formData.get("notes")??"").trim()||null;
  const dueDate=String(formData.get("dueDate")??"").trim()||null;
  const followUpDate=String(formData.get("followUpDate")??"").trim()||null;
  if(!studentId||!action)return{error:"Student and intervention action are required."};
  const {data,error}=await supabase.from("academic_interventions").insert({student_id:studentId,subject_id:subjectId,assigned_to:assignedTo,action,notes,due_date:dueDate,follow_up_date:followUpDate,created_by:profile.user_id}).select("id").single();
  if(error)return{error:error.message};
  if(data)await logAudit({actorId:profile.user_id,action:"intervention_created",entityType:"academic_interventions",entityId:data.id,newData:{student_id:studentId,subject_id:subjectId,assigned_to:assignedTo,action,due_date:dueDate,follow_up_date:followUpDate}});
  revalidatePath("/coordinator/interventions"); revalidatePath("/coordinator/academic-health"); revalidatePath("/principal/academic-health"); revalidatePath("/owner/academic-health");
  return{error:null};
}

export async function updateIntervention(id:string,status:string,outcome:string):Promise<Result>{
  const profile=await requireAnyRole(["owner","academic_coordinator"]); const supabase=createClient();
  if(!["open","in_progress","completed","cancelled"].includes(status))return{error:"Invalid intervention status."};
  const {data:old}=await supabase.from("academic_interventions").select("status,outcome").eq("id",id).maybeSingle();
  const {error}=await supabase.from("academic_interventions").update({status,outcome:outcome.trim()||null,updated_at:new Date().toISOString()}).eq("id",id);
  if(error)return{error:error.message};
  await logAudit({actorId:profile.user_id,action:"intervention_updated",entityType:"academic_interventions",entityId:id,oldData:old,newData:{status,outcome:outcome.trim()||null}});
  revalidatePath("/coordinator/interventions"); revalidatePath("/coordinator/academic-health"); revalidatePath("/principal/academic-health"); revalidatePath("/owner/academic-health");
  return{error:null};
}
