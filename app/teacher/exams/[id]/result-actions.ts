"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function submitResultsForReview(scheduleItemId:string):Promise<{error:string|null}>{
  const profile=await requireRole("teacher"); const supabase=createClient();
  const {data:schedule}=await supabase.from("schedule_items").select("id,class_id,subject_id").eq("id",scheduleItemId).maybeSingle();
  if(!schedule)return{error:"Exam not found."};
  const {data:students}=await supabase.from("students").select("id").eq("class_id",schedule.class_id).eq("is_active",true);
  const {data:results}=await supabase.from("test_results").select("student_id,marks_obtained,is_absent,is_pass").eq("schedule_item_id",scheduleItemId);
  const expected=students?.length??0; const entered=results?.length??0;
  if(expected===0)return{error:"No active students are enrolled in this class."};
  if(entered<expected)return{error:`Enter results for all ${expected} students before submitting.`};
  if((results??[]).some(r=>!r.is_absent&&r.marks_obtained===null))return{error:"Every present student needs marks before submission."};
  const {data:submission}=await supabase.from("result_submissions").select("id,status,teacher_id").eq("schedule_item_id",scheduleItemId).maybeSingle();
  if(submission&&submission.teacher_id!==profile.user_id)return{error:"You do not own this result submission."};
  if(submission&&["submitted","reviewed","finalized"].includes(submission.status))return{error:"Results are already submitted."};
  const {error}=await supabase.from("result_submissions").upsert({schedule_item_id:scheduleItemId,teacher_id:profile.user_id,status:"submitted",submitted_at:new Date().toISOString()},{onConflict:"schedule_item_id"});
  if(error)return{error:error.message};
  revalidatePath(`/teacher/exams/${scheduleItemId}`); revalidatePath("/teacher"); revalidatePath("/coordinator/results"); revalidatePath("/owner/results");
  return{error:null};
}
