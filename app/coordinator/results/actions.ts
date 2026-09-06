"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result={error:string|null};

export async function reviewResultSubmission(id:string,status:"reviewed"|"finalized"|"rejected",notes:string):Promise<Result>{
  const profile=await requireAnyRole(["owner","academic_coordinator"]); const supabase=createClient();
  if(status==='rejected'&&!notes.trim())return{error:'A rejection reason is required.'};
  const {error}=await supabase.from('result_submissions').update({status,reviewed_by:profile.user_id,reviewed_at:new Date().toISOString(),review_notes:notes.trim()||null}).eq('id',id);
  if(error)return{error:error.message};
  revalidatePath('/coordinator/results'); revalidatePath('/coordinator/academic-health'); revalidatePath('/principal/results'); revalidatePath('/owner/results');
  return{error:null};
}

export async function finalizeResult(id:string){return reviewResultSubmission(id,'finalized','');}
export async function rejectResult(id:string,notes:string){return reviewResultSubmission(id,'rejected',notes);}
