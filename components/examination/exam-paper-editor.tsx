"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import {
  saveExamPaperDraft,
  submitExamPaper,
  type ExamPaperStatus
} from "@/app/teacher/exams/[id]/actions";

const STATUS_LABEL: Record<ExamPaperStatus, string> = {
  not_started: "Not started",
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  conducted: "Conducted",
  results_pending: "Results pending",
  completed: "Completed"
};

const STATUS_VARIANT: Record<
  ExamPaperStatus,
  "success" | "warning" | "danger" | "neutral" | "info"
> = {
  not_started: "neutral",
  draft: "warning",
  submitted: "info",
  under_review: "info",
  approved: "success",
  conducted: "success",
  results_pending: "warning",
  completed: "success"
};

// A teacher can only ever move a paper through not_started -> draft ->
// submitted themselves (enforced by a DB trigger); anything past that is
// owner-controlled on a different page, so editing is locked here too.
const TEACHER_EDITABLE_STATUSES: ExamPaperStatus[] = ["not_started", "draft", "submitted"];

export interface ExamPaperEditorProps {
  scheduleItemId: string;
  status: ExamPaperStatus;
  initialContent: string;
}

function ExamPaperEditorInner({
  scheduleItemId,
  status,
  initialContent
}: ExamPaperEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSubmitted = status !== "not_started" && status !== "draft";
  const canEdit = TEACHER_EDITABLE_STATUSES.includes(status) && !isSubmitted;

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const result = await saveExamPaperDraft(scheduleItemId, content);
    setSavingDraft(false);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    toast("Draft saved", "success");
    router.refresh();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitExamPaper(scheduleItemId, content);
    setSubmitting(false);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    toast("Paper submitted for review", "success");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Paper
        </h2>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </div>

      {canEdit ? (
        <>
          <Textarea
            label="Paper content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or write the exam paper text here..."
            rows={10}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              loading={savingDraft}
              disabled={submitting}
              onClick={handleSaveDraft}
            >
              Save draft
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              disabled={savingDraft}
              onClick={handleSubmit}
            >
              Submit for review
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-500">
            This paper has been submitted and can no longer be edited here. The
            school owner will review it next.
          </p>
          {content ? (
            <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              {content}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ExamPaperEditor(props: ExamPaperEditorProps) {
  return (
    <ToastProvider>
      <ExamPaperEditorInner {...props} />
    </ToastProvider>
  );
}
