import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ClerkPrintQueue } from "@/components/examination/clerk-print-queue";
import { getT } from "@/lib/i18n/get-translator";

export default async function ClerkPapersPage() {
  await requireRole("clerk");
  const supabase = createClient();
  const t = await getT();
  const [{ data: papers }, { data: schedules }, { data: classes }, { data: subjects }, { data: teachers }, { data: jobs }] = await Promise.all([
    supabase.from("exam_papers").select("*").order("submitted_at", { ascending: false }),
    supabase.from("schedule_items").select("id,title,class_id,subject_id,scheduled_date"),
    supabase.from("classes").select("id,name"),
    supabase.from("subjects").select("id,name"),
    supabase.from("profiles").select("user_id,full_name").eq("role", "teacher"),
    supabase.from("exam_paper_print_jobs").select("*").order("created_at", { ascending: false })
  ]);
  const scheduleById = new Map((schedules ?? []).map((s) => [s.id, s]));
  const classById = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const subjectById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const teacherById = new Map((teachers ?? []).map((teacher) => [teacher.user_id, teacher.full_name]));
  const latestJobByPaper = new Map<string, any>();
  for (const job of jobs ?? []) if (!latestJobByPaper.has(job.exam_paper_id)) latestJobByPaper.set(job.exam_paper_id, job);
  const rows = (papers ?? []).map((paper) => { const schedule = scheduleById.get(paper.schedule_item_id); return { paper, schedule: schedule ?? { id: paper.schedule_item_id, title: t("clerk.papers.examFallback"), class_id: "", subject_id: "" }, className: classById.get(schedule?.class_id ?? "") ?? t("clerk.papers.unknownClass"), subjectName: subjectById.get(schedule?.subject_id ?? "") ?? t("clerk.papers.unknownSubject"), teacherName: teacherById.get(paper.teacher_id) ?? t("clerk.papers.unknownTeacher"), job: latestJobByPaper.get(paper.id) ?? null }; });
  return <main className="p-4 sm:p-6"><h1 className="text-xl font-semibold text-neutral-900">{t("clerk.papers.title")}</h1><p className="mt-1 text-sm text-neutral-500">{t("clerk.papers.subtitle")}</p><div className="mt-5"><ClerkPrintQueue rows={rows} /></div></main>;
}
