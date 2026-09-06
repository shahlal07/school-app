import type { Class, Student, Subject } from "@/types/examination";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import type {
  AcademicAnomalyRow,
  DailyBrief,
  DangerRow,
  HealthMetric,
  InterventionEffectivenessRow,
  ReadinessRow,
  StudentRiskRow,
  TeacherComplianceRow,
  TopicHeatmapRow
} from "@/components/examination/academic-intelligence";
import { getT } from "@/lib/i18n/get-translator";

interface ScheduleRow {
  id:string; class_id:string; subject_id:string; topic_id:string|null; teacher_id:string|null;
  status:string; scheduled_date:string; title:string;
}
interface PaperRow {
  id:string; schedule_item_id:string; teacher_id:string; status:string; print_status:string|null; review_notes:string|null;
}
interface ResultRow {
  schedule_item_id:string; student_id:string; marks_obtained:number|null; total_marks:number;
  is_absent:boolean; is_pass:boolean|null;
}
interface SubmissionRow { schedule_item_id:string; status:string; submitted_at?:string|null; }
interface TopicRow { id:string; chapter_id:string; name:string; }
interface InterventionRow {
  id:string; student_id:string; subject_id:string|null; schedule_item_id:string|null; action:string;
  due_date:string|null; follow_up_date:string|null; outcome:string|null; status:string; created_at:string;
}

const pct=(n:number,d:number)=>d>0?Math.round(n/d*100):100;

export interface AcademicIntelligenceData {
  readiness:ReadinessRow[];
  dangers:DangerRow[];
  studentRisks:StudentRiskRow[];
  teachers:TeacherComplianceRow[];
  healthMetrics:HealthMetric[];
  healthScore:number;
  dailyBrief:DailyBrief;
  topicHeatmap:TopicHeatmapRow[];
  anomalies:AcademicAnomalyRow[];
  interventionEffectiveness:InterventionEffectivenessRow[];
}

export async function getAcademicIntelligenceData():Promise<AcademicIntelligenceData>{
  const supabase=createClient();
  const t=await getT();
  const now=new Date();
  const todayIso=now.toISOString().slice(0,10);
  const end=new Date(now); end.setDate(end.getDate()+7); const endIso=end.toISOString().slice(0,10);

  const [schedulesRes,papersRes,resultsRes,submissionsRes,classesRes,subjectsRes,studentsRes,teachersRes,topicsRes,interventionsRes]=await Promise.all([
    supabase.from("schedule_items").select("id,class_id,subject_id,topic_id,teacher_id,status,scheduled_date,title"),
    supabase.from("exam_papers").select("id,schedule_item_id,teacher_id,status,print_status,review_notes"),
    supabase.from("test_results").select("schedule_item_id,student_id,marks_obtained,total_marks,is_absent,is_pass"),
    supabase.from("result_submissions").select("schedule_item_id,status,submitted_at"),
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("students").select("*").eq("is_active",true),
    supabase.from("profiles").select("user_id,id,full_name,role,is_active").eq("role","teacher").eq("is_active",true),
    supabase.from("topics").select("id,chapter_id,name"),
    supabase.from("academic_interventions").select("id,student_id,subject_id,schedule_item_id,action,due_date,follow_up_date,outcome,status,created_at").order("created_at",{ascending:false}).limit(100)
  ]);

  const schedules=(schedulesRes.data as ScheduleRow[]|null)??[];
  const papers=(papersRes.data as PaperRow[]|null)??[];
  const results=(resultsRes.data as ResultRow[]|null)??[];
  const submissions=(submissionsRes.data as SubmissionRow[]|null)??[];
  const classes=(classesRes.data as Class[]|null)??[];
  const subjects=(subjectsRes.data as Subject[]|null)??[];
  const students=(studentsRes.data as Student[]|null)??[];
  const teachers=(teachersRes.data as Profile[]|null)??[];
  const topics=(topicsRes.data as TopicRow[]|null)??[];
  const interventions=(interventionsRes.data as InterventionRow[]|null)??[];

  const classById=new Map(classes.map(r=>[r.id,r]));
  const subjectById=new Map(subjects.map(r=>[r.id,r]));
  const topicById=new Map(topics.map(r=>[r.id,r]));
  const teacherById=new Map(teachers.map(r=>[r.user_id,r]));
  const paperBySchedule=new Map(papers.map(r=>[r.schedule_item_id,r]));
  const submissionBySchedule=new Map(submissions.map(r=>[r.schedule_item_id,r]));
  const scheduleById=new Map(schedules.map(r=>[r.id,r]));
  const resultsBySchedule=new Map<string,ResultRow[]>();
  const resultsByStudent=new Map<string,ResultRow[]>();

  for(const r of results){
    const a=resultsBySchedule.get(r.schedule_item_id)??[]; a.push(r); resultsBySchedule.set(r.schedule_item_id,a);
    const b=resultsByStudent.get(r.student_id)??[]; b.push(r); resultsByStudent.set(r.student_id,b);
  }

  const expectedStudents=(classId:string)=>students.filter(st=>st.class_id===classId).length;

  const readiness=schedules
    .filter(s=>s.status!=="cancelled"&&s.scheduled_date>=todayIso&&s.scheduled_date<=endIso)
    .sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date))
    .map(s=>{
      const p=paperBySchedule.get(s.id); const rows=resultsBySchedule.get(s.id)??[]; const expected=expectedStudents(s.class_id);
      const checks=[!!p,!!p&&p.status==="approved",!!p&&p.print_status==="printed",s.status==="completed",expected>0&&rows.length>=expected,submissionBySchedule.get(s.id)?.status==="finalized"];
      return {
        id:s.id,title:s.title,date:s.scheduled_date,className:classById.get(s.class_id)?.name??t("coordinator.fallback.unknownClass"),
        subjectName:subjectById.get(s.subject_id)?.name??t("coordinator.fallback.unknownSubject"),teacherName:teacherById.get(s.teacher_id??"")?.full_name??t("coordinator.fallback.unassigned"),
        paper:!!checks[0],approved:!!checks[1],printed:!!checks[2],conducted:!!checks[3],resultsComplete:!!checks[4],resultsFinalized:!!checks[5],
        score:Math.round(checks.filter(Boolean).length/checks.length*100)
      };
    });

  const dangers:DangerRow[]=[];
  for(const r of readiness){
    const days=Math.round((new Date(`${r.date}T00:00:00`).getTime()-new Date(`${todayIso}T00:00:00`).getTime())/86400000);
    const p=paperBySchedule.get(r.id);
    if(!r.paper&&days<=2)dangers.push({severity:days<=1?"urgent":"high",label:t("intelligence.paperMissingLabel"),detail:`${r.title} ${t("intelligence.paperMissingDueOn")} ${r.date}.`,href:"/coordinator/papers"});
    if(r.approved&&!r.printed&&days<=1)dangers.push({severity:"critical",label:t("intelligence.approvedNotPrintedLabel"),detail:`${r.title} ${t("intelligence.scheduledOn")} ${r.date}.`,href:"/clerk/papers"});
    if(p?.status==="draft"&&p.review_notes)dangers.push({severity:"high",label:t("intelligence.paperNeedsCorrectionLabel"),detail:`${r.title} ${t("intelligence.paperNeedsCorrectionDetailSuffix")}`,href:"/coordinator/papers"});
  }

  const pastSchedules=schedules.filter(s=>s.scheduled_date<todayIso&&s.status!=="cancelled");
  const missingResults=pastSchedules.filter(s=>{
    const expected=expectedStudents(s.class_id); return s.status==="completed"&&expected>0&&(resultsBySchedule.get(s.id)?.length??0)<expected;
  });
  const overdueTests=pastSchedules.filter(s=>["upcoming","scheduled","draft"].includes(s.status));
  if(missingResults.length) dangers.push({severity:missingResults.length>=3?"critical":"high",label:t("intelligence.resultsIncompleteLabel"),detail:`${missingResults.length} ${t("intelligence.resultsIncompleteDetailSuffix")}`,href:"/coordinator/results"});
  if(overdueTests.length) dangers.push({severity:overdueTests.length>=3?"critical":"urgent",label:t("intelligence.testsOverdueLabel"),detail:`${overdueTests.length} ${t("intelligence.testsOverdueDetailSuffix")}`,href:"/coordinator/schedule"});

  const studentRisks:StudentRiskRow[]=[];
  for(const st of students){
    const graded=(resultsByStudent.get(st.id)??[]).filter(r=>r.is_pass!==null&&!r.is_absent);
    if(graded.length<2)continue;
    const dated=graded.slice().sort((a,b)=>(scheduleById.get(b.schedule_item_id)?.scheduled_date??"").localeCompare(scheduleById.get(a.schedule_item_id)?.scheduled_date??""));
    const failed=graded.filter(r=>r.is_pass===false).length;
    const average=pct(graded.reduce((s,r)=>s+(Number(r.marks_obtained)||0),0),graded.reduce((s,r)=>s+Number(r.total_marks),0));
    const consecutive=dated.slice(0,3).length===3&&dated.slice(0,3).every(r=>r.is_pass===false);
    const subjectGroups=new Map<string,{fail:number;total:number}>();
    for(const r of graded){const sid=scheduleById.get(r.schedule_item_id)?.subject_id;if(!sid)continue;const g=subjectGroups.get(sid)??{fail:0,total:0};g.total++;if(r.is_pass===false)g.fail++;subjectGroups.set(sid,g);}
    const weakSubjects=Array.from(subjectGroups.entries()).sort((a,b)=>(b[1].fail/Math.max(b[1].total,1))-(a[1].fail/Math.max(a[1].total,1))).filter(([,g])=>g.fail>0).slice(0,3).map(([id])=>subjectById.get(id)?.name??t("coordinator.fallback.unknownSubject"));
    const score=Math.min(100,Math.round(failed/Math.max(graded.length,1)*65+Math.max(0,60-average)*.8+(consecutive?25:0)));
    if(score>=35)studentRisks.push({id:st.id,name:st.name,rollNo:st.roll_no,className:classById.get(st.class_id)?.name??t("coordinator.fallback.unknownClass"),score,failed,average,weakSubjects});
  }
  studentRisks.sort((a,b)=>b.score-a.score);

  const teacherCompliance:TeacherComplianceRow[]=teachers.map(t=>{
    const ts=schedules.filter(s=>s.teacher_id===t.user_id&&s.status!=="cancelled"&&s.scheduled_date<=endIso);
    const scheduled=ts.length;
    const papersCount=ts.filter(s=>{const st=paperBySchedule.get(s.id)?.status;return !!st&&!['not_started','draft'].includes(st);}).length;
    const completed=ts.filter(s=>s.status==='completed').length;
    const completedResults=ts.filter(s=>{const expected=expectedStudents(s.class_id);return expected>0&&(resultsBySchedule.get(s.id)?.length??0)>=expected;}).length;
    const teacherAttempts=ts.flatMap(s=>resultsBySchedule.get(s.id)??[]).filter(r=>r.is_pass!==null&&!r.is_absent);
    const outcomePassRate=teacherAttempts.length?pct(teacherAttempts.filter(r=>r.is_pass===true).length,teacherAttempts.length):null;
    const paperScore=pct(papersCount,scheduled),testScore=pct(completed,scheduled),resultScore=pct(completedResults,completed);
    return {id:t.user_id,name:t.full_name,scheduled,papers:papersCount,completed,results:completedResults,score:Math.round(paperScore*.35+testScore*.3+resultScore*.35),outcomePassRate};
  }).sort((a,b)=>a.score-b.score);

  const topicStats=new Map<string,{attempts:number;failed:number;marks:number;total:number}>();
  for(const r of results){
    const schedule=scheduleById.get(r.schedule_item_id); if(!schedule?.topic_id||r.is_absent||r.is_pass===null)continue;
    const g=topicStats.get(schedule.topic_id)??{attempts:0,failed:0,marks:0,total:0};
    g.attempts++; if(r.is_pass===false)g.failed++; g.marks+=Number(r.marks_obtained)||0; g.total+=Number(r.total_marks)||0; topicStats.set(schedule.topic_id,g);
  }
  const topicHeatmap=Array.from(topicStats.entries())
    .map(([topicId,g])=>({topicId,name:topicById.get(topicId)?.name??t("intelligence.unknownTopic"),subjectName:subjectById.get(scheduleById.get((results.find(r=>r.schedule_item_id&&scheduleById.get(r.schedule_item_id)?.topic_id===topicId)?.schedule_item_id??"")||"")?.subject_id??"")?.name??t("coordinator.fallback.unknownSubject"),attempts:g.attempts,failRate:pct(g.failed,g.attempts),average:pct(g.marks,g.total)}))
    .sort((a,b)=>b.failRate-a.failRate||b.attempts-a.attempts).slice(0,10);

  const anomalies:AcademicAnomalyRow[]=[];
  for(const s of schedules.filter(x=>x.status==="completed")){
    const rows=(resultsBySchedule.get(s.id)??[]).filter(r=>!r.is_absent&&r.marks_obtained!==null&&r.total_marks>0);
    if(rows.length<4)continue;
    const distinct=new Set(rows.map(r=>Number(r.marks_obtained).toFixed(2)));
    const passRate=pct(rows.filter(r=>r.is_pass===true).length,rows.length);
    if(distinct.size===1)anomalies.push({severity:"high",label:t("intelligence.identicalMarksLabel"),detail:`${s.title}: ${t("intelligence.identicalMarksDetailAll")} ${rows.length} ${t("intelligence.identicalMarksDetailSuffix")}`,href:"/coordinator/results"});
    else if(passRate>=95)anomalies.push({severity:"warning",label:t("intelligence.highPassRateLabel"),detail:`${s.title}: ${passRate}% ${t("intelligence.passRateDetailPassed")} (${rows.length} ${t("intelligence.gradedWord")}).`,href:"/coordinator/results"});
    else if(passRate<=10)anomalies.push({severity:"high",label:t("intelligence.lowPassRateLabel"),detail:`${s.title}: ${passRate}% ${t("intelligence.passRateDetailPassed")} (${rows.length} ${t("intelligence.gradedWord")}).`,href:"/coordinator/results"});
  }

  const interventionEffectiveness:InterventionEffectivenessRow[]=interventions
    .filter(i=>i.follow_up_date)
    .map(i=>{
      const pre=(resultsByStudent.get(i.student_id)??[]).filter(r=>{const d=scheduleById.get(r.schedule_item_id)?.scheduled_date;return d&&d<i.created_at.slice(0,10)&&!r.is_absent&&r.marks_obtained!==null;});
      const post=(resultsByStudent.get(i.student_id)??[]).filter(r=>{const d=scheduleById.get(r.schedule_item_id)?.scheduled_date;return d&&d>=String(i.follow_up_date)&&!r.is_absent&&r.marks_obtained!==null;});
      const average=(rows:ResultRow[])=>rows.length?pct(rows.reduce((sum,r)=>sum+(Number(r.marks_obtained)||0),0),rows.reduce((sum,r)=>sum+Number(r.total_marks),0)):null;
      const before=average(pre); const after=average(post); const improvement=before!==null&&after!==null?after-before:null;
      return {id:i.id,studentName:students.find(s=>s.id===i.student_id)?.name??t("coordinator.fallback.unknownStudent"),action:i.action,followUpDate:i.follow_up_date??"",beforeAverage:before,afterAverage:after,improvement,outcome:i.outcome,status:i.status};
    }).filter(r=>r.beforeAverage!==null||r.afterAverage!==null).slice(0,10);

  const completedSchedules=schedules.filter(s=>s.status==='completed');
  const upcomingReadiness=readiness.length?Math.round(readiness.reduce((sum,r)=>sum+r.score,0)/readiness.length):100;
  const teacherScore=teacherCompliance.length?Math.round(teacherCompliance.reduce((sum,r)=>sum+r.score,0)/teacherCompliance.length):100;
  const resultCompletion=completedSchedules.length?Math.round(completedSchedules.filter(s=>{const expected=expectedStudents(s.class_id);return expected>0&&(resultsBySchedule.get(s.id)?.length??0)>=expected;}).length/completedSchedules.length*100):100;
  const graded=results.filter(r=>r.is_pass!==null&&!r.is_absent);
  const performanceScore=graded.length?Math.round(graded.filter(r=>r.is_pass).length/graded.length*100):100;
  const topicsCovered=new Set(schedules.filter(s=>s.status==='completed'&&s.topic_id).map(s=>s.topic_id as string));
  const topicCountRes=await supabase.from("topics").select("id",{count:"exact",head:true});
  const syllabusScore=pct(topicsCovered.size,topicCountRes.count??0);

  const todayExams=schedules.filter(s=>s.scheduled_date===todayIso&&s.status!=="cancelled");
  const ungradedToday=todayExams.reduce((sum,s)=>Math.max(0,expectedStudents(s.class_id)-(resultsBySchedule.get(s.id)?.length??0)),0);
  const overdueTeacherIds=new Set(overdueTests.map(s=>s.teacher_id).filter((id):id is string=>Boolean(id)));
  const dailyBrief:DailyBrief={
    todayExams:todayExams.length,
    urgentIssues:dangers.filter(d=>d.severity==="critical"||d.severity==="urgent").length,
    atRiskStudents:studentRisks.filter(s=>s.score>=70).length,
    ungradedStudents:ungradedToday,
    overdueTeachers:overdueTeacherIds.size,
    headline:dangers.length===0?t("intelligence.noDangerHeadline"):`${dangers.length} ${dangers.length===1?t("intelligence.activeIssueSingular"):t("intelligence.activeIssuePlural")}`
  };

  const healthMetrics:HealthMetric[]=[
    {label:t("intelligence.examReadiness"),score:upcomingReadiness,detail:`${readiness.length} ${t("intelligence.examReadinessMetricDetailSuffix")}`},
    {label:t("intelligence.teacherCompliance"),score:teacherScore,detail:t("intelligence.teacherComplianceMetricDetail")},
    {label:t("intelligence.resultCompletionMetric"),score:resultCompletion,detail:`${completedSchedules.length} ${t("intelligence.resultCompletionMetricDetailSuffix")}`},
    {label:t("intelligence.studentPerformanceMetric"),score:performanceScore,detail:graded.length?`${graded.length} ${t("intelligence.studentPerformanceMetricDetailSuffix")}`:t("intelligence.studentPerformanceMetricNoData")},
    {label:t("intelligence.syllabusProgressMetric"),score:syllabusScore,detail:`${topicsCovered.size} ${t("intelligence.syllabusProgressMetricDetailOf")} ${topicCountRes.count??0} ${t("intelligence.syllabusProgressMetricDetailSuffix")}`}
  ];

  return {
    readiness,dangers:dangers.slice(0,10),studentRisks:studentRisks.slice(0,10),teachers:teacherCompliance,healthMetrics,
    healthScore:Math.round(healthMetrics.reduce((sum,m)=>sum+m.score,0)/healthMetrics.length),dailyBrief,
    topicHeatmap,anomalies:anomalies.slice(0,10),interventionEffectiveness
  };
}
