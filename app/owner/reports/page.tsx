import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Class, Subject } from "@/types/examination";
import type { Profile } from "@/types/database";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

interface ScheduleItemRow { id: string; class_id: string; subject_id: string; teacher_id: string | null; status: string; }
interface ExamPaperRow { schedule_item_id: string; status: string; }

export default async function ReportsPage() {
  const supabase = createClient();
  const t = await getT();
  const [classesRes, subjectsRes, chaptersRes, scheduleRes, papersRes, teachersRes, teacherSubjectsRes] = await Promise.all([
    supabase.from("classes").select("*"), supabase.from("subjects").select("*"), supabase.from("chapters").select("subject_id"),
    supabase.from("schedule_items").select("id, class_id, subject_id, teacher_id, status"), supabase.from("exam_papers").select("schedule_item_id, status"),
    supabase.from("profiles").select("*").eq("role", "teacher"), supabase.from("teacher_subjects").select("teacher_id, subject_id, class_id")
  ]);
  const classes = ((classesRes.data as Class[] | null) ?? []).slice().sort((a,b) => classOrderIndex(a.name)-classOrderIndex(b.name));
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const chapterSubjectIds = new Set(((chaptersRes.data as {subject_id:string}[] | null) ?? []).map(c => c.subject_id));
  const scheduleItems = (scheduleRes.data as ScheduleItemRow[] | null) ?? [];
  const papers = (papersRes.data as ExamPaperRow[] | null) ?? [];
  const teachers = (teachersRes.data as Profile[] | null) ?? [];
  const teacherSubjects = (teacherSubjectsRes.data as {teacher_id:string; subject_id:string; class_id:string}[] | null) ?? [];
  const paperStatus = new Map(papers.map(p => [p.schedule_item_id,p.status]));
  const syllabusByClass = classes.map(klass => { const classSubjects=subjects.filter(s=>s.class_id===klass.id); const covered=classSubjects.filter(s=>chapterSubjectIds.has(s.id)).length; return {klass,total:classSubjects.length,covered}; });
  const compliance = teachers.map(teacher => { const assigned=new Set(teacherSubjects.filter(ts=>ts.teacher_id===teacher.user_id).map(ts=>ts.subject_id)); const items=scheduleItems.filter(i=>assigned.has(i.subject_id)&&i.status!=="cancelled"); const submitted=items.filter(i=>{const s=paperStatus.get(i.id); return !!s&&s!=="not_started"&&s!=="draft";}).length; return {teacher,total:items.length,submitted,subjects:assigned.size}; });
  const totalSubjects = syllabusByClass.reduce((n,r)=>n+r.total,0);
  const coveredSubjects = syllabusByClass.reduce((n,r)=>n+r.covered,0);
  const totalScheduled = scheduleItems.filter(i=>i.status!=="cancelled").length;
  const completedScheduled = scheduleItems.filter(i=>i.status==="completed").length;
  const reportHealth = totalScheduled ? Math.round((completedScheduled/totalScheduled)*100) : 0;

  return <main className="p-4 sm:p-6 space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Owner · Reports</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Executive reports</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">A school-wide snapshot of academic delivery and examination progress. Use it for oversight and decisions, not routine data entry.</p>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Report health" value={`${reportHealth}%`} detail="Completed scheduled assessments" />
      <Metric label="Syllabus coverage" value={`${totalSubjects ? Math.round(coveredSubjects/totalSubjects*100) : 0}%`} detail={`${coveredSubjects} of ${totalSubjects} subjects have chapters`} />
      <Metric label="Active teachers" value={teachers.length} detail="Teacher profiles in the system" />
      <Metric label="Assessments" value={totalScheduled} detail={`${completedScheduled} completed`} />
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>{t("owner.reports.syllabusCoverageByClass")}</CardTitle></CardHeader><CardContent><ul className="flex flex-col gap-2">{syllabusByClass.map(({klass,total,covered}) => <li key={klass.id} className="rounded-xl bg-neutral-50 px-3 py-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-neutral-800"><Bdi>{klass.name}</Bdi></span><span className="font-semibold text-neutral-900"><Bdi>{covered}/{total}</Bdi></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-primary-600" style={{width:`${total?covered/total*100:0}%`}} /></div></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("owner.reports.teacherCompliance")}</CardTitle></CardHeader><CardContent>{teachers.length===0?<p className="text-sm text-neutral-500">{t("owner.reports.noTeachersYet")}</p>:<ul className="flex flex-col gap-2">{compliance.map(({teacher,total,submitted,subjects})=><li key={teacher.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-800"><Bdi>{teacher.full_name}</Bdi></p><p className="text-xs text-neutral-500"><Bdi>{subjects}</Bdi> {subjects===1?t("owner.reports.subjectSingular"):t("owner.reports.subjectsSuffix")} {t("owner.reports.assignedSuffix")}</p></div><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">{total===0?t("owner.reports.noTestsYet"):`${submitted} / ${total} ${t("owner.reports.papersSuffix")}`}</span></li>)}</ul>}</CardContent></Card>
    </section>
  </main>;
}

function Metric({label,value,detail}:{label:string;value:string|number;detail:string}) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-neutral-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>; }
