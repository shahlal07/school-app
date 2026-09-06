import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import type { ScheduleTestType } from "@/lib/scheduling/generate-schedule";
import type { BadgeProps } from "@/components/ui/badge";

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
  current_version: number;
  created_at: string;
  updated_at: string;
}

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

export const PAPER_STATUS_BADGE_VARIANT: Record<ExamPaperStatus, NonNullable<BadgeProps["variant"]>> = {
  not_started: "neutral",
  draft: "neutral",
  submitted: "warning",
  under_review: "warning",
  approved: "info",
  conducted: "info",
  results_pending: "info",
  completed: "success"
};
