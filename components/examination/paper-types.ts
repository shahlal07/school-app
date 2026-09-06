import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import type { ScheduleTestType } from "@/lib/scheduling/generate-schedule";
import type { BadgeProps } from "@/components/ui/badge";

/**
 * Mirrors the `exam_papers.status` check constraint exactly. `not_started`
 * additionally doubles as a virtual status for `schedule_items` rows that
 * have no `exam_papers` row at all yet (a paper record isn't created until a
 * teacher first touches it) - see `PaperQueueRow.status` below.
 */
export type ExamPaperStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "conducted"
  | "results_pending"
  | "completed";

export interface ExamPaper {
  id: string;
  schedule_item_id: string;
  teacher_id: string;
  status: ExamPaperStatus;
  content: string | null;
  file_path: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** One row in the owner's paper review queue - a schedule item joined with
 * its (possibly absent) exam paper, class/subject names, and the submitting
 * teacher's name. */
export interface PaperQueueRow {
  scheduleItem: ScheduleItemRow;
  paper: ExamPaper | null;
  className: string;
  subjectName: string;
  teacherName: string | null;
  testType: ScheduleTestType;
  status: ExamPaperStatus;
}

export const PAPER_STATUS_LABEL: Record<ExamPaperStatus, string> = {
  not_started: "Not started",
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  conducted: "Conducted",
  results_pending: "Results pending",
  completed: "Completed"
};

export const PAPER_STATUS_BADGE_VARIANT: Record<
  ExamPaperStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  not_started: "neutral",
  draft: "neutral",
  submitted: "warning",
  under_review: "warning",
  approved: "info",
  conducted: "info",
  results_pending: "info",
  completed: "success"
};
