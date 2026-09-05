import type { GeneratedScheduleItem, ScheduleTestType } from "@/lib/scheduling/generate-schedule";
import { Badge } from "@/components/ui/badge";

export type ScheduleItemStatus =
  | "upcoming"
  | "draft"
  | "scheduled"
  | "completed"
  | "skipped"
  | "rescheduled"
  | "cancelled";

export interface ScheduleItemRow {
  id: string;
  class_id: string;
  subject_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  teacher_id: string | null;
  test_type: ScheduleTestType;
  status: ScheduleItemStatus;
  scheduled_date: string;
  title: string;
  created_at: string;
  updated_at: string;
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

const STATUS_VARIANT: Record<ScheduleItemStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  upcoming: "info",
  draft: "neutral",
  scheduled: "info",
  completed: "success",
  skipped: "warning",
  rescheduled: "warning",
  cancelled: "danger"
};

function formatDisplayDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

interface ScheduleListRowProps {
  date: string;
  title: string;
  testType: ScheduleTestType;
  status?: ScheduleItemStatus;
}

function ScheduleListRow({ date, title, testType, status }: ScheduleListRowProps) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-neutral-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-neutral-900">{title}</span>
        <span className="text-xs text-neutral-500">{formatDisplayDate(date)}</span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Badge variant="neutral">{TEST_TYPE_LABEL[testType]}</Badge>
        {status && <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>}
      </div>
    </li>
  );
}

export function ExistingScheduleList({ items }: { items: ScheduleItemRow[] }) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <ul className="flex flex-col">
      {sorted.map((item) => (
        <ScheduleListRow
          key={item.id}
          date={item.scheduled_date}
          title={item.title}
          testType={item.test_type}
          status={item.status}
        />
      ))}
    </ul>
  );
}

export function PreviewScheduleList({ items }: { items: GeneratedScheduleItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-col">
      {items.map((item, index) => (
        <ScheduleListRow
          // eslint-disable-next-line react/no-array-index-key -- previews have no stable id yet
          key={`${item.chapterId}-${item.topicId ?? "chapter"}-${index}`}
          date={item.date}
          title={item.title}
          testType={item.testType}
        />
      ))}
    </ul>
  );
}
