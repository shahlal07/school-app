"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getT } from "@/lib/i18n/get-translator";

type ActionResult={error:string|null};
const PAPERS_PATH="/owner/papers"; const COORDINATOR_PAPERS_PATH="/coordinator/papers";
const QUALITY_KEYS=["class_correct","subject_correct","chapter_correct","marks_present","instructions_present","readable","file_present"] as const;
type QualityCheck=Record<(typeof QUALITY_KEYS)[number],boolean>;

async function markLatestVersion(supabase:ReturnType<typeof createClient>,paperId:string,status:"approved"|"rejected"){const {data:v}=await supabase.from("exam_paper_versions").select("id").eq("exam_paper_id",paperId).order("version_number",{ascending:false}).limit(1).maybeSingle();if(v?.id)await supabase.from("exam_paper_versions").update({status}).eq("id",v.id);}
// "file_present" is only a real requirement when the paper actually has a
// file_path - a teacher may legitimately submit text-only content (the
// editor itself labels the file as optional), so that key is excluded from
// the required set entirely when there's nothing to attach, and always
// derived from the real column rather than trusted from client input (a
// caller could otherwise falsely claim a file exists, or fail to claim one
// that does).
function validQuality(input:unknown,hasFile:boolean):input is QualityCheck{
  if(typeof input!=='object'||input===null)return false;
  const record=input as Record<string,unknown>;
  return QUALITY_KEYS.every(k=>k==="file_present"?(!hasFile||record[k]===true):record[k]===true);
}

export async function approvePaper(paperId:string,reviewNotes:string,quality?:Partial<QualityCheck>):Promise<ActionResult>{
 const profile=await requireRole("academic_coordinator");const supabase=createClient();const t=await getT();
 const {data:paper}=await supabase.from("exam_papers").select("id,teacher_id,quality_check,file_path").eq("id",paperId).maybeSingle();if(!paper)return{error:t("owner.papers.notFound")};
 const hasFile=Boolean(paper.file_path);
 const suppliedQuality=quality??paper.quality_check;
 if(!validQuality(suppliedQuality,hasFile))return{error:t("owner.papers.completeQualityCheck")};
 const effectiveQuality={...(suppliedQuality as QualityCheck),file_present:hasFile};
 const {error}=await supabase.from("exam_papers").update({status:"approved",reviewed_at:new Date().toISOString(),reviewed_by:profile.user_id,review_notes:reviewNotes.trim()||null,quality_check:effectiveQuality,quality_checked_at:new Date().toISOString(),quality_checked_by:profile.user_id}).eq("id",paperId);if(error)return{error:error.message};
 await markLatestVersion(supabase,paperId,"approved");await supabase.from("alerts").insert({type:"paper_approved",severity:"info",teacher_id:paper.teacher_id,recipient_id:paper.teacher_id,reference_table:"exam_papers",reference_id:paperId,message:"Your exam paper was approved and is ready for the clerk to place for printing."});await logAudit({actorId:profile.user_id,action:"paper_approved",entityType:"exam_papers",entityId:paperId,newData:{review_notes:reviewNotes.trim()||null,quality_check:effectiveQuality}});
 revalidatePath(PAPERS_PATH);revalidatePath(COORDINATOR_PAPERS_PATH);revalidatePath("/clerk/papers");revalidatePath("/teacher/alerts");revalidatePath("/teacher");return{error:null};
}
export async function rejectPaper(paperId:string,reviewNotes:string):Promise<ActionResult>{const profile=await requireRole("academic_coordinator");const supabase=createClient();const t=await getT();const trimmed=reviewNotes.trim();if(!trimmed)return{error:t("owner.papers.explainRejection")};const {data:paper}=await supabase.from("exam_papers").select("id,teacher_id").eq("id",paperId).maybeSingle();if(!paper)return{error:t("owner.papers.notFound")};const {error}=await supabase.from("exam_papers").update({status:"draft",reviewed_at:new Date().toISOString(),reviewed_by:profile.user_id,review_notes:trimmed}).eq("id",paperId);if(error)return{error:error.message};await markLatestVersion(supabase,paperId,"rejected");await supabase.from("alerts").insert({type:"paper_rejected",severity:"warning",teacher_id:paper.teacher_id,recipient_id:paper.teacher_id,reference_table:"exam_papers",reference_id:paperId,message:`Your exam paper needs changes: ${trimmed}`});await logAudit({actorId:profile.user_id,action:"paper_rejected",entityType:"exam_papers",entityId:paperId,newData:{review_notes:trimmed}});revalidatePath(PAPERS_PATH);revalidatePath(COORDINATOR_PAPERS_PATH);revalidatePath("/clerk/papers");revalidatePath("/teacher/alerts");revalidatePath("/teacher");return{error:null};}
