import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Class, Subject } from "@/types/examination";
import type { Profile } from "@/types/database";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

interface ScheduleItemRow {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  status: string;
}

interface ExamPaperRow {
  schedule_item_id: string;
  status: string;
}

export default async function ReportsPage() {
  const supabase = createClient();
  const t = await getT();

  const [classesRes, subjectsRes, chaptersRes, scheduleRes, papersRes, teachersRes, teacherSubjectsRes] =
    await Promise.all([
      supabase.from("classes").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("chapters").select("subject_id"),
      supabase.from("schedule_items").select("id, class_id, subject_id, teacher_id, status"),
      supabase.from("exam_papers").select("schedule_item_id, status"),
      supabase.from("profiles").select("*").eq("role", "teacher"),
      supabase.from("teacher_subjects").select("teacher_id, subject_id, class_id")
    ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapterSubjectIds = new Set(
    ((chaptersRes.data as { subject_id: string }[] | null) ?? []).map((c) => c.subject_id)
  );
  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const papers = (papersRes.data as ExamPaperRow[] | null) ?? [];
  const teachers = (teachersRes.data as Profile[] | null) ?? [];
  const teacherSubjects =
    (teacherSubjectsRes.data as { teacher_id: string; subject_id: string; class_id: string }[] | null) ??
    [];

  const paperStatusByScheduleItem = new Map(papers.map((p) => [p.schedule_item_id, p.status]));

  // Syllabus coverage per class: how many of this class's subjects have at
  // least one chapter.
  const syllabusByClass = classes.map((klass) => {
    const classSubjects = subjects.filter((s) => s.class_id === klass.id);
    const withSyllabus = classSubjects.filter((s) => chapterSubjectIds.has(s.id)).length;
    return { klass, total: classSubjects.length, withSyllabus };
  });

  // Teacher compliance: of their assigned subjects' schedule_items that are
  // due or past, how many have a submitted-or-later paper.
  const teacherCompliance = teachers.map((teacher) => {
    const assignedSubjectIds = new Set(
      teacherSubjects.filter((ts) => ts.teacher_id === teacher.user_id).map((ts) => ts.subject_id)
    );
    const relevantItems = scheduleItems.filter(
      (item) => assignedSubjectIds.has(item.subject_id) && item.status !== "cancelled"
    );
    const papersSubmitted = relevantItems.filter((item) => {
      const status = paperStatusByScheduleItem.get(item.id);
      return status && status !== "not_started" && status !== "draft";
    }).length;
    return {
      teacher,
      total: relevantItems.length,
      papersSubmitted,
      assignedSubjects: assignedSubjectIds.size
    };
  });

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.reports")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("owner.reports.subtitle")}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("owner.reports.syllabusCoverageByClass")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {syllabusByClass.map(({ klass, total, withSyllabus }) => (
                <li
                  key={klass.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-neutral-800"><Bdi>{klass.name}</Bdi></span>
                  <Badge variant={withSyllabus === total && total > 0 ? "success" : "neutral"}>
                    <Bdi>{withSyllabus} / {total}</Bdi> {t("owner.reports.subjectsSuffix")}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("owner.reports.teacherCompliance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("owner.reports.noTeachersYet")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {teacherCompliance.map(({ teacher, total, papersSubmitted, assignedSubjects }) => (
                  <li
                    key={teacher.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-800"><Bdi>{teacher.full_name}</Bdi></p>
                      <p className="text-xs text-neutral-500">
                        <Bdi>{assignedSubjects}</Bdi> {assignedSubjects === 1 ? t("owner.reports.subjectSingular") : t("owner.reports.subjectsSuffix")} {t("owner.reports.assignedSuffix")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        total === 0 ? "neutral" : papersSubmitted === total ? "success" : "warning"
                      }
                    >
                      {total === 0 ? t("owner.reports.noTestsYet") : <><Bdi>{papersSubmitted} / {total}</Bdi> {t("owner.reports.papersSuffix")}</>}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
