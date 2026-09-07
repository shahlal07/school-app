import Link from "next/link";
import { notFound } from "next/navigation";
import type { Class, Student, Subject } from "@/types/examination";
import type { ExamAttendanceStatus } from "@/types/attendance";
import type { ScheduleItemRow } from "@/components/examination/schedule-list";
import { formatScheduleDate } from "@/components/examination/teacher-schedule-card";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bdi } from "@/components/shared/bdi";
import { ExamPaperEditor } from "@/components/examination/exam-paper-editor";
import { ExamPaperTimeline } from "@/components/examination/exam-paper-timeline";
import { ExamResultsRoster } from "@/components/examination/exam-results-roster";
import { ExamAttendanceForm } from "@/components/attendance/exam-attendance-form";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { markPaperHandedToClerk } from "./delegation-actions";
import type { ExamPaperStatus } from "./actions";

interface ExamPaperRow { id:string; schedule_item_id:string; status:ExamPaperStatus; content:string|null; file_path:string|null; submitted_at:string|null; reviewed_at:string|null; review_notes:string|null; current_version:number; handed_to_clerk_at:string|null; handed_to_clerk_by:string|null; }
interface TestResultRow { student_id:string; marks_obtained:number|null; total_marks:number; is_absent:boolean; is_pass:boolean|null; }
interface VersionRow { id:string; version_number:number; created_at:string; status:string; }
interface PrintJobRow { id:string; status:string; queued_at:string; printed_at:string|null; copies:number; color_mode:string; duplex:boolean; priority:string; reprint_reason:string|null; }

export default async function TeacherExamDetailPage({params}:{params:{id:string}}){
 const t=await getT();
 const TEST_TYPE_LABEL:Record<string,string>={topic:t("teacher.testType.topic"),chapter:t("teacher.testType.chapter"),revision:t("teacher.testType.revision"),monthly:t("teacher.testType.monthly"),midterm:t("teacher.testType.midterm"),terminal:t("teacher.testType.terminal"),final:t("teacher.testType.final"),custom:t("teacher.testType.custom")};
 const supabase=createClient(); const {data:scheduleItem}=await supabase.from("schedule_items").select("*").eq("id",params.id).maybeSingle(); if(!scheduleItem)notFound(); const item=scheduleItem as ScheduleItemRow;
 const [classRes,subjectRes,chapterRes,topicRes,examPaperRes,studentsRes,resultsRes,examAttendanceRes]=await Promise.all([
  supabase.from("classes").select("*").eq("id",item.class_id).maybeSingle(),supabase.from("subjects").select("*").eq("id",item.subject_id).maybeSingle(),item.chapter_id?supabase.from("chapters").select("name").eq("id",item.chapter_id).maybeSingle():Promise.resolve({data:null}),item.topic_id?supabase.from("topics").select("name").eq("id",item.topic_id).maybeSingle():Promise.resolve({data:null}),supabase.from("exam_papers").select("id,schedule_item_id,status,content,file_path,submitted_at,reviewed_at,review_notes,current_version,handed_to_clerk_at,handed_to_clerk_by").eq("schedule_item_id",item.id).maybeSingle(),supabase.from("students").select("*").eq("class_id",item.class_id).eq("is_active",true).order("roll_no"),supabase.from("test_results").select("student_id,marks_obtained,total_marks,is_absent,is_pass").eq("schedule_item_id",item.id),supabase.from("exam_attendance_sessions").select("id,status").eq("schedule_item_id",item.id).maybeSingle()
 ]);
 const klass=classRes.data as Class|null,subject=subjectRes.data as Subject|null,chapterName=(chapterRes.data as {name:string}|null)?.name??null,topicName=(topicRes.data as {name:string}|null)?.name??null,examPaper=examPaperRes.data as ExamPaperRow|null,students=(studentsRes.data as Student[]|null)??[],existingResults=(resultsRes.data as TestResultRow[]|null)??[],examAttendanceSession=examAttendanceRes.data as {id:string;status:string}|null;
 const paperStatus:ExamPaperStatus=examPaper?.status??"not_started",subjectAndClass=[subject?.name,klass?.name].filter(Boolean).join(" - ");
 const [versionsRes,jobsRes,examAttendanceRecordsRes]=await Promise.all([
  examPaper?supabase.from("exam_paper_versions").select("id,version_number,created_at,status").eq("exam_paper_id",examPaper.id).order("version_number",{ascending:false}):Promise.resolve({data:[] as VersionRow[]}),
  examPaper?supabase.from("exam_paper_print_jobs").select("id,status,queued_at,printed_at,copies,color_mode,duplex,priority,reprint_reason").eq("exam_paper_id",examPaper.id).order("created_at",{ascending:false}):Promise.resolve({data:[] as PrintJobRow[]}),
  examAttendanceSession?supabase.from("exam_attendance_records").select("student_id,status").eq("exam_attendance_session_id",examAttendanceSession.id):Promise.resolve({data:[] as {student_id:string;status:ExamAttendanceStatus}[]})
 ]);
 let fileUrl:string|null=null; if(examPaper?.file_path){const {data}=await supabase.storage.from("exam-papers").createSignedUrl(examPaper.file_path,300);fileUrl=data?.signedUrl??null;}
 const versions=(versionsRes.data as VersionRow[]|null)??[],jobs=(jobsRes.data as PrintJobRow[]|null)??[],examAttendanceExisting:Record<string,ExamAttendanceStatus>={}; for(const row of (examAttendanceRecordsRes.data as {student_id:string;status:ExamAttendanceStatus}[]|null)??[]) examAttendanceExisting[row.student_id]=row.status;
 const examAttendanceComplete=examAttendanceSession?.status==="submitted"&&Object.keys(examAttendanceExisting).length===students.length;
 const resultsComplete=students.length>0&&existingResults.length>=students.length;
 const deadlineIso=new Date(new Date(`${item.scheduled_date}T00:00:00+05:00`).getTime()+48*60*60*1000).toISOString();
 const examPassed=new Date(`${item.scheduled_date}T00:00:00+05:00`).getTime()<=Date.now();
 const canHandPaper=!examPaper?.handed_to_clerk_at&&!['submitted','under_review','approved','conducted','results_pending','completed'].includes(paperStatus);
 const handoff=markPaperHandedToClerk.bind(null,item.id);
 return <main className="p-4 sm:p-6"><Link href="/teacher/exams" className="text-sm font-medium text-primary-600">&larr; {t("teacher.examDetail.backToExams")}</Link><div className="mt-3 flex flex-col gap-1"><h1 className="text-xl font-semibold text-neutral-900"><Bdi>{item.title}</Bdi></h1>{subjectAndClass&&<p className="text-sm text-neutral-500"><Bdi>{subjectAndClass}</Bdi></p>}{(chapterName||topicName)&&<p className="text-xs text-neutral-500"><Bdi>{[chapterName,topicName].filter(Boolean).join(" - ")}</Bdi></p>}<div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge variant="neutral">{TEST_TYPE_LABEL[item.test_type]??item.test_type}</Badge><span className="text-xs text-neutral-500"><Bdi>{formatScheduleDate(item.scheduled_date)}</Bdi></span></div></div>
 <div className="mt-5 flex flex-col gap-4">
  {canHandPaper&&<Card><CardContent><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-neutral-900">Hand paper to clerk</p><p className="mt-1 text-xs text-neutral-500">Use this when the checked paper is being delivered physically instead of submitted digitally.</p></div><form action={handoff}><button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Mark handed to clerk</button></form></div></CardContent></Card>}
  {examPassed&&!resultsComplete&&<Card><CardContent><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Results deadline</p><div className="mt-1 flex flex-wrap items-baseline gap-2"><span className="text-2xl font-semibold"><CountdownTimer deadlineIso={deadlineIso}/></span><span className="text-sm text-neutral-500">remaining to enter checked-paper results</span></div></CardContent></Card>}
  <Card><CardContent><ExamAttendanceForm scheduleItemId={item.id} students={students.map(student=>({id:student.id,roll_no:student.roll_no,name:student.name}))} existing={examAttendanceExisting} submitted={examAttendanceComplete}/></CardContent></Card><Card><CardContent><ExamPaperEditor scheduleItemId={item.id} status={paperStatus} initialContent={examPaper?.content??""} initialFilePath={examPaper?.file_path??null}/></CardContent></Card>{examPaper&&<ExamPaperTimeline status={examPaper.status} submittedAt={examPaper.submitted_at} reviewedAt={examPaper.reviewed_at} reviewNotes={examPaper.review_notes} currentVersion={examPaper.current_version} versions={versions} jobs={jobs} fileUrl={fileUrl}/>}<Card><CardContent><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("terms.results")}</h2><ExamResultsRoster scheduleItemId={item.id} students={students} existingResults={existingResults} examAttendance={examAttendanceExisting}/></CardContent></Card></div></main>;
}
