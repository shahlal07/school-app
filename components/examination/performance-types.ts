import type { BadgeProps } from "@/components/ui/badge";

/**
 * Raw shape of a graded row from `test_results`. Only rows where `is_pass`
 * is non-null are "graded" - `is_pass` is computed by a DB trigger and is
 * null until a result has actually been entered, so ungraded rows must never
 * be counted toward a pass rate.
 */
export interface GradedResultRow {
  id: string;
  schedule_item_id: string;
  student_id: string;
  marks_obtained: number | null;
  total_marks: number;
  is_pass: boolean | null;
  is_absent: boolean;
  remarks: string | null;
}

export interface PassRateStat {
  passed: number;
  total: number;
  /** Percentage in [0, 100], rounded to one decimal place. */
  passRate: number;
}

export interface SubjectPerformance extends PassRateStat {
  subjectId: string;
  subjectName: string;
}

export interface ClassPerformance extends PassRateStat {
  classId: string;
  className: string;
  subjects: SubjectPerformance[];
}

export interface WeakTopic extends PassRateStat {
  topicId: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  className: string;
}

export function makePassRateStat(passed: number, total: number): PassRateStat {
  return {
    passed,
    total,
    passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0
  };
}

/**
 * Pass-rate -> badge color thresholds (documented per task spec):
 *   >= 70%      -> success (healthy)
 *   40% - 69.9% -> warning (needs attention)
 *   < 40%       -> danger (weak)
 */
export function passRateVariant(passRate: number): NonNullable<BadgeProps["variant"]> {
  if (passRate >= 70) return "success";
  if (passRate >= 40) return "warning";
  return "danger";
}

/**
 * Average marks percentage across graded, non-absent rows: sum(marks_obtained)
 * / sum(total_marks) * 100, rounded to one decimal place (same rounding as
 * makePassRateStat). A row only counts toward the average once it's actually
 * graded (`is_pass` non-null, mirroring the "graded" convention used
 * everywhere else in this file) and the student wasn't absent for it - an
 * absent row has `marks_obtained` cleared to null by the DB trigger, so it
 * can never contribute a real score. Returns null (rather than 0) when there
 * is nothing to average, since 0% would misleadingly read as "scored zero".
 */
export function averageMarksPercent(rows: GradedResultRow[]): number | null {
  let obtainedSum = 0;
  let totalSum = 0;

  for (const row of rows) {
    if (row.is_pass === null || row.is_absent || row.marks_obtained === null) continue;
    obtainedSum += row.marks_obtained;
    totalSum += row.total_marks;
  }

  return totalSum > 0 ? Math.round((obtainedSum / totalSum) * 1000) / 10 : null;
}

/** Minimum number of graded results a topic needs before it can be flagged as "weak". */
export const MIN_TOPIC_SAMPLE_SIZE = 3;

/** Number of weakest topics to surface. */
export const WEAK_TOPIC_LIMIT = 5;
