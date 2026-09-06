import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Class, Subject } from "@/types/examination";

interface ScheduleItemRow {
  id: string;
  class_id: string;
  subject_id: string;
  title: string;
  scheduled_date: string;
  status: string;
}

interface TestResultCountRow {
  schedule_item_id: string;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

export default async function ResultsPage() {
  const supabase = createClient();

  const [completedRes, classesRes, subjectsRes, resultsRes, studentsRes] = await Promise.all([
    supabase
      .from("schedule_items")
      .select("id, class_id, subject_id, title, scheduled_date, status")
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false }),
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("test_results").select("schedule_item_id"),
    supabase.from("students").select("id, class_id").eq("is_active", true)
  ]);

  const completedItems = (completedRes.data as ScheduleItemRow[] | null) ?? [];
  const classById = new Map(((classesRes.data as Class[] | null) ?? []).map((c) => [c.id, c]));
  const subjectById = new Map(((subjectsRes.data as Subject[] | null) ?? []).map((s) => [s.id, s]));
  const resultCounts = new Map<string, number>();
  for (const row of (resultsRes.data as TestResultCountRow[] | null) ?? []) {
    resultCounts.set(row.schedule_item_id, (resultCounts.get(row.schedule_item_id) ?? 0) + 1);
  }
  const activeStudentCountByClass = new Map<string, number>();
  for (const student of (studentsRes.data as { id: string; class_id: string }[] | null) ?? []) {
    activeStudentCountByClass.set(
      student.class_id,
      (activeStudentCountByClass.get(student.class_id) ?? 0) + 1
    );
  }

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Results</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Every completed test and how many students have been graded so far. Enter marks from a
        teacher&apos;s exam detail page.
      </p>

      <div className="mt-5">
        {completedItems.length === 0 ? (
          <EmptyState
            title="No completed tests yet"
            description="Once a test is scheduled, submitted, and marked conducted, it will show up here for results tracking."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {completedItems.map((item) => {
              const graded = resultCounts.get(item.id) ?? 0;
              const totalStudents = activeStudentCountByClass.get(item.class_id) ?? 0;
              const complete = totalStudents > 0 && graded >= totalStudents;
              return (
                <li key={item.id}>
                  <Link
                    href={`/teacher/exams/${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{item.title}</p>
                      <p className="text-xs text-neutral-500">
                        {subjectById.get(item.subject_id)?.name ?? "Unknown subject"} ·{" "}
                        {classById.get(item.class_id)?.name ?? "Unknown class"} ·{" "}
                        {formatDate(item.scheduled_date)}
                      </p>
                    </div>
                    <Badge variant={complete ? "success" : "warning"}>
                      {graded}/{totalStudents || "?"} graded
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
