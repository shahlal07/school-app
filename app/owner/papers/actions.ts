"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type ActionResult={error:string|null};
const PAPERS_PATH="/owner/papers"; const COORDINATOR_PAPERS_PATH="/coordinator/papers";
const QUALITY_KEYS=["class_correct","subject_correct","chapter_correct","marks_present","instructions_present","readable","file_present"] as const;
type QualityCheck=Record<(typeof QUALITY_KEYS)[number],boolean>;

async function markLatestVersion(supabase:ReturnType<typeof createClient>,paperId:string,status:"approved"|"rejected"){const {data:v}=await supabase.from("exam_paper_versions").select("id").eq("exam_paper_id",paperId).order("version_number",{ascending:false}).limit(1).maybeSingle();if(v?.id)await supabase.from("exam_paper_versions").update({status}).eq("id",v.id);}
function validQuality(input:unknown):input is QualityCheck{return typeof input==='object'&&input!==null&&QUALITY_KEYS.every(k=>(input as Record<string,unknown>)[k]===true);}

export async function approvePaper(paperId:string,reviewNotes:string,quality?:Partial<QualityCheck>):Promise<ActionResult>{
 const profile=await requireAnyRole(["owner","academic_coordinator"]);const supabase=createClient();
 const {data:paper}=await supabase.from("exam_papers").select("id,teacher_id,quality_check").eq("id",paperId).maybeSingle();if(!paper)return{error:"Paper not found."};
 if(!validQuality(quality??paper.quality_check))return{error:"Complete every paper quality check before approval."};
 const {error}=await supabase.from("exam_papers").update({status:"approved",reviewed_at:new Date().toISOString(),reviewed_by:profile.user_id,review_notes:reviewNotes.trim()||null,quality_check:quality,quality_checked_at:new Date().toISOString(),quality_checked_by:profile.user_id}).eq("id",paperId);if(error)return{error:error.message};
 await markLatestVersion(supabase,paperId,"approved");await supabase.from("alerts").insert({type:"paper_approved",severity:"info",teacher_id:paper.teacher_id,recipient_id:paper.teacher_id,reference_table:"exam_papers",reference_id:paperId,message:"Your exam paper was approved and is ready for the clerk to place for printing."});await logAudit({actorId:profile.user_id,action:"paper_approved",entityType:"exam_papers",entityId:paperId,newData:{review_notes:reviewNotes.trim()||null,quality_check:quality}});
 revalidatePath(PAPERS_PATH);revalidatePath(COORDINATOR_PAPERS_PATH);revalidatePath("/clerk/papers");revalidatePath("/teacher/alerts");revalidatePath("/teacher");return{error:null};
}
export async function rejectPaper(paperId:string,reviewNotes:string):Promise<ActionResult>{const profile=await requireAnyRole(["owner","academic_coordinator"]);const supabase=createClient();const trimmed=reviewNotes.trim();if(!trimmed)return{error:"Please explain what needs to change before rejecting a paper."};const {data:paper}=await supabase.from("exam_papers").select("id,teacher_id").eq("id",paperId).maybeSingle();if(!paper)return{error:"Paper not found."};const {error}=await supabase.from("exam_papers").update({status:"draft",reviewed_at:new Date().toISOString(),reviewed_by:profile.user_id,review_notes:trimmed}).eq("id",paperId);if(error)return{error:error.message};await markLatestVersion(supabase,paperId,"rejected");await supabase.from("alerts").insert({type:"paper_rejected",severity:"warning",teacher_id:paper.teacher_id,recipient_id:paper.teacher_id,reference_table:"exam_papers",reference_id:paperId,message:`Your exam paper needs changes: ${trimmed}`});await logAudit({actorId:profile.user_id,action:"paper_rejected",entityType:"exam_papers",entityId:paperId,newData:{review_notes:trimmed}});revalidatePath(PAPERS_PATH);revalidatePath(COORDINATOR_PAPERS_PATH);revalidatePath("/clerk/papers");revalidatePath("/teacher/alerts");revalidatePath("/teacher");return{error:null};}
