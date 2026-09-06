import Link from "next/link";

import type { ScheduleTestType } from "@/lib/scheduling/generate-schedule";
import type { ScheduleItemStatus } from "@/components/examination/schedule-list";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * A schedule_items row enriched with the joined class/subject/chapter/topic
 * names a teacher's Exams tab needs to display. `title` is already a
 * human-readable label baked in by the schedule generator (e.g. "Chapter 1 -
 * Topic 2"), so it's shown as-is rather than reconstructed from the joins.
 */
export interface TeacherScheduleItem {
  id: string;
  class_id: string;
  subject_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  test_type: ScheduleTestType;
  status: ScheduleItemStatus;
  scheduled_date: string;
  title: string;
  className: string | null;
  subjectName: string | null;
  chapterName: string | null;
  topicName: string | null;
}

const TEST_TYPE_LABEL: Record<ScheduleTestType, string> = {
  topic: "Topic test",
  chapter: "Chapter test",
  revision: "Revision",
  monthly: "Monthly",
  midterm: "Midterm",
  terminal: "Terminal",
  final: "Final",
  custom: "Custom"
};

const STATUS_LABEL: Record<ScheduleItemStatus, string> = {
  upcoming: "Upcoming",
  draft: "Draft",
  scheduled: "Scheduled",
  completed: "Completed",
  skipped: "Skipped",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled"
};

const STATUS_VARIANT: Record<
  ScheduleItemStatus,
  "success" | "warning" | "danger" | "neutral" | "info"
> = {
  upcoming: "info",
  draft: "neutral",
  scheduled: "info",
  completed: "success",
  skipped: "danger",
  rescheduled: "warning",
  cancelled: "danger"
};

export function formatScheduleDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

export function TeacherScheduleCard({ item }: { item: TeacherScheduleItem }) {
  const subjectAndClass = [item.subjectName, item.className].filter(Boolean).join(" - ");

  return (
    <Link href={`/teacher/exams/${item.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-900">{item.title}</p>
              {subjectAndClass && (
                <p className="mt-0.5 truncate text-xs text-neutral-500">{subjectAndClass}</p>
              )}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-neutral-500">
              {formatScheduleDate(item.scheduled_date)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{TEST_TYPE_LABEL[item.test_type]}</Badge>
            <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
