/**
 * Pure scheduling algorithm - no I/O, no Supabase calls, independently
 * testable. Given a subject's chapters (each with its topics, in order),
 * walks them sequentially: every topic gets a daily topic test on the
 * next eligible day, then a chapter test follows once all of a chapter's
 * topics are scheduled, then the next chapter begins.
 */

export type ScheduleTestType =
  | "topic"
  | "chapter"
  | "revision"
  | "monthly"
  | "midterm"
  | "terminal"
  | "final"
  | "custom";

export interface TopicInput {
  topicId: string;
  topicName: string;
  orderIndex: number;
}

export interface ChapterWithTopics {
  chapterId: string;
  chapterName: string;
  orderIndex: number;
  topics: TopicInput[];
}

export interface GeneratedScheduleItem {
  date: string; // ISO yyyy-mm-dd
  testType: ScheduleTestType;
  chapterId: string;
  topicId: string | null;
  title: string;
}

export interface GenerateScheduleInput {
  chapters: ChapterWithTopics[];
  /** ISO yyyy-mm-dd. If not itself an eligible day, the first eligible day at or after this date is used. */
  startDate: string;
  /** 0=Sunday .. 6=Saturday. Days eligible for a test. Must be non-empty. */
  testDaysOfWeek: number[];
  /** ISO yyyy-mm-dd dates to skip entirely, even if otherwise eligible. */
  holidays?: string[];
  /** Whether to insert a chapter test after a chapter's topics. Defaults to true. */
  includeChapterTest?: boolean;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isEligibleDay(
  date: Date,
  testDaysOfWeek: Set<number>,
  holidays: Set<string>
): boolean {
  if (!testDaysOfWeek.has(date.getUTCDay())) return false;
  if (holidays.has(toISODate(date))) return false;
  return true;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function generateSchedule(
  input: GenerateScheduleInput
): GeneratedScheduleItem[] {
  const testDaysOfWeek = new Set(input.testDaysOfWeek);
  const holidays = new Set(input.holidays ?? []);
  const includeChapterTest = input.includeChapterTest ?? true;

  if (testDaysOfWeek.size === 0) {
    throw new Error("At least one test day of week must be provided.");
  }

  const sortedChapters = [...input.chapters].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  let cursor = new Date(`${input.startDate}T00:00:00.000Z`);
  while (!isEligibleDay(cursor, testDaysOfWeek, holidays)) {
    cursor = addDays(cursor, 1);
  }

  const result: GeneratedScheduleItem[] = [];

  function advanceToNextEligibleDay(): void {
    cursor = addDays(cursor, 1);
    while (!isEligibleDay(cursor, testDaysOfWeek, holidays)) {
      cursor = addDays(cursor, 1);
    }
  }

  for (const chapter of sortedChapters) {
    const sortedTopics = [...chapter.topics].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );

    for (const topic of sortedTopics) {
      result.push({
        date: toISODate(cursor),
        testType: "topic",
        chapterId: chapter.chapterId,
        topicId: topic.topicId,
        title: `${chapter.chapterName} - ${topic.topicName}`
      });
      advanceToNextEligibleDay();
    }

    if (includeChapterTest) {
      result.push({
        date: toISODate(cursor),
        testType: "chapter",
        chapterId: chapter.chapterId,
        topicId: null,
        title: `${chapter.chapterName} - Chapter Test`
      });
      advanceToNextEligibleDay();
    }
  }

  return result;
}
