"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";

type Result={error:string|null};

export async function reviewResultSubmission(id:string,status:"reviewed"|"finalized"|"rejected",notes:string):Promise<Result>{
  const profile=await requireRole("academic_coordinator"); const supabase=createClient(); const t=await getT();
  if(status==='rejected'&&!notes.trim())return{error:t("coordinator.results.rejectionReasonRequired")};
  const {data:submission,error:fetchError}=await supabase.from('result_submissions').select('schedule_item_id').eq('id',id).maybeSingle();
  if(fetchError)return{error:fetchError.message};
  if(!submission)return{error:t("coordinator.results.submissionNotFound")};
  const {error}=await supabase.from('result_submissions').update({status,reviewed_by:profile.user_id,reviewed_at:new Date().toISOString(),review_notes:notes.trim()||null}).eq('id',id);
  if(error)return{error:error.message};
  // Finalizing results is the authoritative "this exam cycle is done" signal -
  // without this, owner/results and principal/results (which list schedule
  // items with status='completed') would never show a fully graded exam,
  // since nothing else in the app ever makes that transition.
  if(status==='finalized'){
    const {error:scheduleError}=await supabase.from('schedule_items').update({status:'completed'}).eq('id',submission.schedule_item_id);
    if(scheduleError)return{error:scheduleError.message};
    // If this schedule item is part of an exam set (continuous exam-set
    // model), this may be the set's last remaining subject - check whether
    // the whole set just completed.
    await supabase.rpc('check_and_complete_exam_set',{p_schedule_item_id:submission.schedule_item_id});
  }
  revalidatePath('/coordinator/results'); revalidatePath('/coordinator/academic-health'); revalidatePath('/principal/results'); revalidatePath('/owner/results'); revalidatePath('/coordinator/schedule'); revalidatePath('/owner/schedule');
  return{error:null};
}

export async function finalizeResult(id:string){return reviewResultSubmission(id,'finalized','');}
export async function rejectResult(id:string,notes:string){return reviewResultSubmission(id,'rejected',notes);}
