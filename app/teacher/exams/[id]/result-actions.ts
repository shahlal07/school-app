"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";

export async function submitResultsForReview(scheduleItemId:string):Promise<{error:string|null}>{
  const profile=await requireRole("teacher"); const t=await getT(); const supabase=createClient();
  const {data:schedule}=await supabase.from("schedule_items").select("id,class_id,subject_id").eq("id",scheduleItemId).maybeSingle();
  if(!schedule)return{error:t("teacher.examDetail.examNotFound")};
  const {data:students}=await supabase.from("students").select("id").eq("class_id",schedule.class_id).eq("is_active",true);
  const {data:results}=await supabase.from("test_results").select("student_id,marks_obtained,is_absent,is_pass").eq("schedule_item_id",scheduleItemId);
  const expected=students?.length??0; const entered=results?.length??0;
  if(expected===0)return{error:t("teacher.resultsRoster.noActiveStudents")};
  if(entered<expected)return{error:`${t("teacher.resultsRoster.enterAllResultsPrefix")} ${expected} ${t("teacher.resultsRoster.enterAllResultsSuffix")}`};
  if((results??[]).some(r=>!r.is_absent&&r.marks_obtained===null))return{error:t("teacher.resultsRoster.everyPresentNeedsMarks")};
  const {data:submission}=await supabase.from("result_submissions").select("id,status,teacher_id").eq("schedule_item_id",scheduleItemId).maybeSingle();
  if(submission&&submission.teacher_id!==profile.user_id)return{error:t("teacher.resultsRoster.notOwner")};
  if(submission&&["submitted","reviewed","finalized"].includes(submission.status))return{error:t("teacher.resultsRoster.alreadySubmitted")};
  const {error}=await supabase.from("result_submissions").upsert({schedule_item_id:scheduleItemId,teacher_id:profile.user_id,status:"submitted",submitted_at:new Date().toISOString()},{onConflict:"schedule_item_id"});
  if(error)return{error:error.message};
  revalidatePath(`/teacher/exams/${scheduleItemId}`); revalidatePath("/teacher"); revalidatePath("/coordinator/results"); revalidatePath("/owner/results");
  return{error:null};
}
