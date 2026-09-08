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

function ScheduleTable({ items, preview = false }: { items: ScheduleItemRow[] | GeneratedScheduleItem[]; preview?: boolean }) {
  if (items.length === 0) return null;

  const rows = preview
    ? (items as GeneratedScheduleItem[]).map((item, index) => ({
        key: `${item.chapterId}-${item.topicId ?? "chapter"}-${index}`,
        date: item.date,
        title: item.title,
        type: TEST_TYPE_LABEL[item.testType],
        status: null as ScheduleItemStatus | null
      }))
    : (items as ScheduleItemRow[])
        .slice()
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .map((item) => ({
          key: item.id,
          date: item.scheduled_date,
          title: item.title,
          type: TEST_TYPE_LABEL[item.test_type],
          status: item.status
        }));

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Exam / Test</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.key} className="align-middle hover:bg-neutral-50/70">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-800">{formatDisplayDate(row.date)}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{row.title}</td>
                <td className="px-4 py-3"><Badge variant="neutral">{row.type}</Badge></td>
                <td className="px-4 py-3">{row.status ? <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> : <span className="text-neutral-400">Preview</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExistingScheduleList({ items }: { items: ScheduleItemRow[] }) {
  return <ScheduleTable items={items} />;
}

export function PreviewScheduleList({ items }: { items: GeneratedScheduleItem[] }) {
  return <ScheduleTable items={items} preview />;
}
