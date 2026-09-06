"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { approvePaper, rejectPaper } from "@/app/owner/papers/actions";
import { getReviewPaperUrl } from "@/components/examination/paper-review-actions";
import { PAPER_STATUS_BADGE_VARIANT, PAPER_STATUS_LABEL, type PaperQueueRow } from "@/components/examination/paper-types";

const checks=[
 ["class_correct","Correct class"], ["subject_correct","Correct subject"], ["chapter_correct","Correct chapter/topic"], ["marks_present","Marks/marking scheme present"], ["instructions_present","Instructions present"], ["readable","Readable"], ["file_present","Paper file attached"]
] as const;
type QualityKey=(typeof checks)[number][0];

interface PaperReviewDialogProps{row:PaperQueueRow|null;onClose:()=>void;}
export function PaperReviewDialog({row,onClose}:PaperReviewDialogProps){
 const router=useRouter();const{toast}=useToast();const[notes,setNotes]=useState("");const[quality,setQuality]=useState<Record<QualityKey,boolean>>(()=>Object.fromEntries(checks.map(([k])=>[k,false])) as Record<QualityKey,boolean>);const[submittingAction,setSubmittingAction]=useState<"approve"|"reject"|"open"|null>(null);
 const handleClose=()=>{if(submittingAction)return;setNotes("");onClose();};
 const handleOpenPaper=async()=>{if(!row?.paper?.file_path)return toast("No paper file was uploaded.","danger");setSubmittingAction("open");const result=await getReviewPaperUrl(row.paper.file_path);setSubmittingAction(null);if(result.error)return toast(result.error,"danger");window.open(result.url!,"_blank","noopener,noreferrer");};
 const handleApprove=async()=>{if(!row?.paper)return;const all=checks.every(([k])=>quality[k]);if(!all)return toast("Complete all quality checks before approving.","danger");setSubmittingAction("approve");const result=await approvePaper(row.paper.id,notes,quality);setSubmittingAction(null);if(result.error)return toast(result.error,"danger");toast("Paper approved","success");setNotes("");onClose();router.refresh();};
 const handleReject=async()=>{if(!row?.paper)return;setSubmittingAction("reject");const result=await rejectPaper(row.paper.id,notes);setSubmittingAction(null);if(result.error)return toast(result.error,"danger");toast("Paper sent back for revision","success");setNotes("");onClose();router.refresh();};
 const submitting=submittingAction!==null;
 return <Dialog open={row!==null} onClose={handleClose} title={row?.scheduleItem.title??undefined} description={row?`${row.className} - ${row.subjectName}`:undefined}>{row&&<div className="flex flex-col gap-4">
  <div className="flex flex-wrap items-center gap-1.5"><Badge variant={PAPER_STATUS_BADGE_VARIANT[row.status]}>{PAPER_STATUS_LABEL[row.status]}</Badge>{row.teacherName&&<Badge variant="neutral">{row.teacherName}</Badge>}{row.paper?.current_version&&<Badge variant="info">Version {row.paper.current_version}</Badge>}</div>
  <div><div className="flex items-center justify-between"><span className="text-sm font-medium text-neutral-700">Paper quality checklist</span><span className="text-xs text-neutral-500">{checks.filter(([k])=>quality[k]).length}/{checks.length}</span></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{checks.map(([key,label])=><label key={key} className="flex items-center gap-2 rounded-lg bg-neutral-50 p-2 text-sm text-neutral-700"><input type="checkbox" checked={quality[key]} onChange={e=>setQuality(prev=>({...prev,[key]:e.target.checked}))} disabled={submitting}/>{label}</label>)}</div></div>
  <div className="flex flex-col gap-1.5"><span className="text-sm font-medium text-neutral-700">Paper content</span><div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900">{row.paper?.content?.trim()?row.paper.content:<span className="text-neutral-400">No text content was submitted.</span>}</div>{row.paper?.file_path&&<div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs text-neutral-500">Attached: {row.paper.file_path.split("/").pop()}</span><Button size="sm" variant="ghost" onClick={handleOpenPaper} loading={submittingAction==='open'} disabled={submitting&&submittingAction!=='open'}>Open file</Button></div>}</div>
  <Textarea label="Review notes" placeholder="Notes for the teacher (required when rejecting)" value={notes} onChange={e=>setNotes(e.target.value)} disabled={submitting}/>
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button><Button variant="destructive" onClick={handleReject} loading={submittingAction==='reject'} disabled={submitting&&submittingAction!=='reject'}>Reject</Button><Button variant="primary" onClick={handleApprove} loading={submittingAction==='approve'} disabled={submitting&&submittingAction!=='approve'}>Approve</Button></div>
 </div>}</Dialog>;
}
