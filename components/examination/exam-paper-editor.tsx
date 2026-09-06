"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { saveExamPaperDraft, submitExamPaper, submitExamPaperFile, type ExamPaperStatus } from "@/app/teacher/exams/[id]/actions";

const STATUS_LABEL: Record<ExamPaperStatus, string> = { not_started: "Not started", draft: "Draft", submitted: "Submitted", under_review: "Under review", approved: "Approved", conducted: "Conducted", results_pending: "Results pending", completed: "Completed" };
const STATUS_VARIANT: Record<ExamPaperStatus, "success" | "warning" | "danger" | "neutral" | "info"> = { not_started: "neutral", draft: "warning", submitted: "info", under_review: "info", approved: "success", conducted: "success", results_pending: "warning", completed: "success" };
const TEACHER_EDITABLE_STATUSES: ExamPaperStatus[] = ["not_started", "draft", "submitted"];

export interface ExamPaperEditorProps { scheduleItemId: string; status: ExamPaperStatus; initialContent: string; initialFilePath?: string | null; }

function ExamPaperEditorInner({ scheduleItemId, status, initialContent, initialFilePath }: ExamPaperEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(initialContent);
  const [fileSelected, setFileSelected] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canEdit = TEACHER_EDITABLE_STATUSES.includes(status);

  const handleSaveDraft = async () => { setSavingDraft(true); const result = await saveExamPaperDraft(scheduleItemId, content); setSavingDraft(false); if (result.error) return toast(result.error, "danger"); toast("Draft saved", "success"); router.refresh(); };
  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0];
    if (file) { setSubmitting(true); const data = new FormData(); data.set("file", file); const result = await submitExamPaperFile(scheduleItemId, content, data); setSubmitting(false); if (result.error) return toast(result.error, "danger"); toast("Paper uploaded and submitted. Clerk and coordinator can now see it.", "success"); if (fileRef.current) fileRef.current.value = ""; setFileSelected(false); router.refresh(); return; }
    setSubmitting(true); const result = await submitExamPaper(scheduleItemId, content); setSubmitting(false); if (result.error) return toast(result.error, "danger"); toast("Paper submitted for review", "success"); router.refresh();
  };

  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Paper</h2><Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge></div>
    {canEdit ? <>
      <Textarea label="Paper content (optional when uploading a file)" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste or write the exam paper text here..." rows={8} />
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3"><label className="text-sm font-medium text-neutral-700">Paper file <span className="font-normal text-neutral-500">(PDF or Word, max 15 MB)</span></label><input ref={fileRef} onChange={(e) => setFileSelected(Boolean(e.target.files?.length))} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="mt-2 block w-full text-sm" /></div>
      {initialFilePath && <p className="text-xs text-neutral-500">A paper file is already attached. Uploading another replaces the attachment.</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" loading={savingDraft} disabled={submitting} onClick={handleSaveDraft}>Save draft</Button><Button type="button" variant="primary" loading={submitting} disabled={savingDraft || (!content.trim() && !fileSelected)} onClick={handleSubmit}>Submit paper</Button></div>
    </> : <div className="flex flex-col gap-2"><p className="text-sm text-neutral-500">This paper has been submitted and can no longer be edited here.</p>{content ? <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">{content}</div> : null}{initialFilePath ? <p className="text-sm font-medium text-neutral-700">Attached paper: {initialFilePath.split("/").pop()}</p> : null}</div>}
  </div>;
}
export function ExamPaperEditor(props: ExamPaperEditorProps) { return <ToastProvider><ExamPaperEditorInner {...props} /></ToastProvider>; }
