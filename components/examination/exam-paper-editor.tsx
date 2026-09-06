"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { saveExamPaperDraft, submitExamPaper, submitExamPaperFile, type ExamPaperStatus } from "@/app/teacher/exams/[id]/actions";

const STATUS_LABEL_KEY: Record<ExamPaperStatus, string> = {
  not_started: "status.notStarted", draft: "status.draft", submitted: "status.submitted", under_review: "status.underReview",
  approved: "status.approved", conducted: "status.conducted", results_pending: "status.resultsPending", completed: "status.completed"
};
const STATUS_VARIANT: Record<ExamPaperStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  not_started: "neutral", draft: "warning", submitted: "info", under_review: "info",
  approved: "success", conducted: "success", results_pending: "warning", completed: "success"
};
const TEACHER_EDITABLE_STATUSES: ExamPaperStatus[] = ["not_started", "draft"];

export interface ExamPaperEditorProps {
  scheduleItemId: string;
  status: ExamPaperStatus;
  initialContent: string;
  initialFilePath?: string | null;
}

function ExamPaperEditorInner({ scheduleItemId, status, initialContent, initialFilePath }: ExamPaperEditorProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(initialContent);
  const [fileSelected, setFileSelected] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canEdit = TEACHER_EDITABLE_STATUSES.includes(status);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const result = await saveExamPaperDraft(scheduleItemId, content);
    setSavingDraft(false);
    if (result.error) return toast(result.error, "danger");
    toast(t("teacher.paperEditor.toastDraftSaved"), "success");
    router.refresh();
  };

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0];
    setSubmitting(true);
    const result = file
      ? await submitExamPaperFile(scheduleItemId, content, (() => { const data = new FormData(); data.set("file", file); return data; })())
      : await submitExamPaper(scheduleItemId, content);
    setSubmitting(false);
    if (result.error) return toast(result.error, "danger");
    toast(t("teacher.paperEditor.toastSubmitted"), "success");
    if (fileRef.current) fileRef.current.value = "";
    setFileSelected(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("terms.paper")}</h2>
          {initialFilePath && <p className="mt-0.5 max-w-[18rem] truncate text-xs text-neutral-500">{initialFilePath.split("/").pop()}</p>}
        </div>
        <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_LABEL_KEY[status])}</Badge>
      </div>

      {canEdit ? (
        <>
          {status === "draft" && initialFilePath && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {t("teacher.paperEditor.returnedNotice")}
            </div>
          )}
          <Textarea
            label={t("teacher.paperEditor.contentLabel")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("teacher.paperEditor.contentPlaceholder")}
            rows={8}
          />
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3">
            <label className="text-sm font-medium text-neutral-700">
              {t("teacher.paperEditor.fileLabel")}{" "}
              <span className="font-normal text-neutral-500">
                {t("teacher.paperEditor.fileHint")}
              </span>
            </label>
            <input
              ref={fileRef}
              onChange={(e) => setFileSelected(Boolean(e.target.files?.length))}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/heic,image/heif,image/webp"
              // capture="environment" opens the rear camera directly on
              // mobile (where most teachers will actually do this) instead
              // of just a file picker - desktop browsers ignore the
              // attribute and just show a normal file picker.
              capture="environment"
              className="mt-2 block w-full text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" loading={savingDraft} disabled={submitting} onClick={handleSaveDraft}>{t("teacher.paperEditor.saveDraft")}</Button>
            <Button type="button" variant="primary" loading={submitting} disabled={savingDraft || (!content.trim() && !fileSelected)} onClick={handleSubmit}>{t("teacher.paperEditor.submitPaper")}</Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
            {t("teacher.paperEditor.lockedNotice")}
          </div>
          {content && <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">{content}</div>}
        </div>
      )}
    </div>
  );
}

export function ExamPaperEditor(props: ExamPaperEditorProps) {
  return <ToastProvider><ExamPaperEditorInner {...props} /></ToastProvider>;
}
