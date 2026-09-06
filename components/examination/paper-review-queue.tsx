"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { ToastProvider } from "@/components/ui/toast";
import {
  PAPER_STATUS_BADGE_VARIANT,
  PAPER_STATUS_LABEL,
  type PaperQueueRow
} from "@/components/examination/paper-types";
import { PaperReviewDialog } from "@/components/examination/paper-review-dialog";

function formatDisplayDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

interface PaperRowCardProps {
  row: PaperQueueRow;
  onReview?: (row: PaperQueueRow) => void;
}

function PaperRowCard({ row, onReview }: PaperRowCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-neutral-900">
            {row.scheduleItem.title}
          </span>
          <span className="truncate text-xs text-neutral-500">
            {row.className} - {row.subjectName} - {formatDisplayDate(row.scheduleItem.scheduled_date)}
          </span>
          {row.teacherName && (
            <span className="truncate text-xs text-neutral-500">Teacher: {row.teacherName}</span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Badge variant={PAPER_STATUS_BADGE_VARIANT[row.status]}>
            {PAPER_STATUS_LABEL[row.status]}
          </Badge>
          {onReview && (
            <Button variant="primary" size="sm" onClick={() => onReview(row)}>
              Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaperRowList({
  rows,
  emptyTitle,
  emptyDescription,
  onReview
}: {
  rows: PaperQueueRow[];
  emptyTitle: string;
  emptyDescription: string;
  onReview?: (row: PaperQueueRow) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.scheduleItem.id}>
          <PaperRowCard row={row} onReview={onReview} />
        </li>
      ))}
    </ul>
  );
}

export interface PaperReviewQueueProps {
  needsReview: PaperQueueRow[];
  inProgress: PaperQueueRow[];
  completed: PaperQueueRow[];
  notStarted: PaperQueueRow[];
}

function PaperReviewQueueInner({
  needsReview,
  inProgress,
  completed,
  notStarted
}: PaperReviewQueueProps) {
  const [reviewingRow, setReviewingRow] = useState<PaperQueueRow | null>(null);

  const totalRows =
    needsReview.length + inProgress.length + completed.length + notStarted.length;

  if (totalRows === 0) {
    return (
      <EmptyState
        title="Nothing to review yet"
        description="Once teachers submit exam papers for scheduled tests, they'll show up here for your review."
      />
    );
  }

  return (
    <>
      <Tabs
        tabs={[
          {
            id: "needs-review",
            label: `Needs review (${needsReview.length})`,
            content: (
              <PaperRowList
                rows={needsReview}
                emptyTitle="Nothing to review"
                emptyDescription="No submitted papers are waiting on your review right now."
                onReview={setReviewingRow}
              />
            )
          },
          {
            id: "in-progress",
            label: `Approved / in progress (${inProgress.length})`,
            content: (
              <PaperRowList
                rows={inProgress}
                emptyTitle="Nothing in progress"
                emptyDescription="Approved papers moving toward conducted or results will show up here."
              />
            )
          },
          {
            id: "completed",
            label: `Completed (${completed.length})`,
            content: (
              <PaperRowList
                rows={completed}
                emptyTitle="Nothing completed yet"
                emptyDescription="Fully wrapped-up exams will show up here."
              />
            )
          },
          {
            id: "not-started",
            label: `Not yet submitted (${notStarted.length})`,
            content: (
              <PaperRowList
                rows={notStarted}
                emptyTitle="Nothing outstanding"
                emptyDescription="Every scheduled test already has a paper in progress or beyond."
              />
            )
          }
        ]}
      />

      <PaperReviewDialog row={reviewingRow} onClose={() => setReviewingRow(null)} />
    </>
  );
}

export function PaperReviewQueue(props: PaperReviewQueueProps) {
  return (
    <ToastProvider>
      <PaperReviewQueueInner {...props} />
    </ToastProvider>
  );
}
