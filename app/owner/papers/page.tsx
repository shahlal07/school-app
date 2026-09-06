import type { Class, Subject } from "@/types/examination";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import type { ExamPaper, ExamPaperStatus, PaperQueueRow } from "@/components/examination/paper-types";
import { PaperReviewQueue } from "@/components/examination/paper-review-queue";
import { getT } from "@/lib/i18n/get-translator";

/**
 * Read-only mirror of app/coordinator/papers - approving/rejecting exam
 * papers is day-to-day academic operations, the coordinator's job, not the
 * owner's. approvePaper()/rejectPaper() (app/owner/papers/actions.ts, kept
 * at this path since coordinator/papers reuses it directly) are guarded
 * with requireRole("academic_coordinator"), so there's no path by which an
 * owner could act on these even if the Review button were shown.
 */
export default async function PapersPage() {
  const supabase = createClient();
  const t = await getT();

  const [scheduleItemsRes, examPapersRes, classesRes, subjectsRes, profilesRes] =
    await Promise.all([
      supabase.from("schedule_items").select("*"),
      supabase.from("exam_papers").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("profiles").select("*").eq("role", "teacher")
    ]);

  const scheduleItems = (scheduleItemsRes.data as ScheduleItemRow[] | null) ?? [];
  const examPapers = (examPapersRes.data as ExamPaper[] | null) ?? [];
  const classes = (classesRes.data as Class[] | null) ?? [];
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const teachers = (profilesRes.data as Profile[] | null) ?? [];

  const classNameById = new Map(classes.map((c) => [c.id, c.name]));
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

  // schedule_items.teacher_id / exam_papers.teacher_id may store either the
  // profile row id or the underlying auth user_id depending on how RLS was
  // wired up - index by both so the join resolves either way.
  const teacherNameById = new Map<string, string>();
  for (const teacher of teachers) {
    teacherNameById.set(teacher.id, teacher.full_name);
    teacherNameById.set(teacher.user_id, teacher.full_name);
  }

  const paperByScheduleItemId = new Map(examPapers.map((p) => [p.schedule_item_id, p]));

  const rows: PaperQueueRow[] = scheduleItems.map((scheduleItem) => {
    const paper = paperByScheduleItemId.get(scheduleItem.id) ?? null;
    const status: ExamPaperStatus = paper?.status ?? "not_started";
    const teacherId = paper?.teacher_id ?? scheduleItem.teacher_id ?? undefined;

    return {
      scheduleItem,
      paper,
      className: classNameById.get(scheduleItem.class_id) ?? t("owner.papers.unknownClass"),
      subjectName: subjectNameById.get(scheduleItem.subject_id) ?? t("owner.papers.unknownSubject"),
      teacherName: teacherId ? teacherNameById.get(teacherId) ?? null : null,
      testType: scheduleItem.test_type,
      status
    };
  });

  const needsReview = rows.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  );
  const inProgress = rows.filter(
    (r) => r.status === "approved" || r.status === "conducted" || r.status === "results_pending"
  );
  const completed = rows.filter((r) => r.status === "completed");
  const notStarted = rows.filter((r) => r.status === "not_started" || r.status === "draft");

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.papers")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("owner.papers.subtitle")}
      </p>

      <div className="mt-5">
        <PaperReviewQueue
          needsReview={needsReview}
          inProgress={inProgress}
          completed={completed}
          notStarted={notStarted}
          readOnly
        />
      </div>
    </main>
  );
}
