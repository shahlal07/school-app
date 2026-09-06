import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

export interface ReadinessRow {
  id:string; title:string; date:string; className:string; subjectName:string; teacherName:string;
  paper:boolean; approved:boolean; printed:boolean; conducted:boolean; resultsComplete:boolean; resultsFinalized:boolean; score:number;
}
export interface DangerRow { severity:"warning"|"high"|"urgent"|"critical"; label:string; detail:string; href?:string; }
export interface StudentRiskRow { id:string; name:string; rollNo:string; className:string; score:number; failed:number; average:number|null; weakSubjects:string[]; }
export interface TeacherComplianceRow { id:string; name:string; scheduled:number; papers:number; completed:number; results:number; score:number; outcomePassRate:number|null; }
export interface HealthMetric { label:string; score:number; detail:string; }
export interface DailyBrief { todayExams:number; urgentIssues:number; atRiskStudents:number; ungradedStudents:number; overdueTeachers:number; headline:string; }
export interface TopicHeatmapRow { topicId:string; name:string; subjectName:string; attempts:number; failRate:number; average:number; }
export interface AcademicAnomalyRow { severity:"warning"|"high"|"urgent"|"critical"; label:string; detail:string; href?:string; }
export interface InterventionEffectivenessRow { id:string; studentName:string; action:string; followUpDate:string; beforeAverage:number|null; afterAverage:number|null; improvement:number|null; outcome:string|null; status:string; }
export interface AcademicIntelligenceProps {
  roleLabel:string; readiness:ReadinessRow[]; dangers:DangerRow[]; studentRisks:StudentRiskRow[]; teachers:TeacherComplianceRow[];
  healthMetrics:HealthMetric[]; healthScore:number; dailyBrief:DailyBrief; topicHeatmap:TopicHeatmapRow[]; anomalies:AcademicAnomalyRow[];
  interventionEffectiveness:InterventionEffectivenessRow[]; interventionHref:string; resultsHref:string;
}

const severityVariant:Record<DangerRow["severity"],"neutral"|"warning"|"danger"|"success">={warning:"warning",high:"danger",urgent:"danger",critical:"danger"};
const formatDelta=(n:number|null)=>n===null?"—":`${n>0?"+":""}${n} pts`;

function Checklist({row,t}:{row:ReadinessRow;t:(key:string)=>string}){
  const items=[[t("intelligence.checklistPaper"),row.paper],[t("intelligence.checklistApproved"),row.approved],[t("intelligence.checklistPrinted"),row.printed],[t("intelligence.checklistConducted"),row.conducted],[t("intelligence.checklistResults"),row.resultsComplete],[t("intelligence.checklistFinal"),row.resultsFinalized]] as const;
  return <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] sm:grid-cols-6">{items.map(([label,ok])=><span key={label} className={`rounded-md px-1.5 py-1 text-center ${ok?"bg-green-50 text-green-700":"bg-neutral-100 text-neutral-500"}`}>{ok?"✓":"○"} {label}</span>)}</div>;
}

export async function AcademicIntelligence({roleLabel,readiness,dangers,studentRisks,teachers,healthMetrics,healthScore,dailyBrief,topicHeatmap,anomalies,interventionEffectiveness,interventionHref,resultsHref}:AcademicIntelligenceProps){
  const t=await getT();
  return <main className="flex flex-col gap-5 p-4 sm:p-6">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-xl font-semibold text-neutral-900">{t("intelligence.title")}</h1><p className="mt-1 text-sm text-neutral-500">{roleLabel} {t("intelligence.viewSuffix")}</p></div>
      <div className="flex gap-2"><Link href={interventionHref} className="rounded-xl bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200">{t("intelligence.interventionsLink")}</Link><Link href={resultsHref} className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">{t("intelligence.resultsPipelineLink")}</Link></div>
    </div>

    <Card>
      <CardHeader><CardTitle>{t("intelligence.todayAtAGlance")}</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-3 text-sm font-medium text-neutral-700">{dailyBrief.headline}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[[t("intelligence.todaysExams"),dailyBrief.todayExams],[t("intelligence.urgentIssuesLabel"),dailyBrief.urgentIssues],[t("intelligence.atRiskStudentsLabel"),dailyBrief.atRiskStudents],[t("intelligence.ungradedTodayLabel"),dailyBrief.ungradedStudents],[t("intelligence.overdueTeachersLabel"),dailyBrief.overdueTeachers]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-neutral-200 p-3"><p className="text-2xl font-semibold text-neutral-900">{value}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></div>)}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>{t("intelligence.schoolHealthScoreTitle")}</CardTitle></CardHeader>
      <CardContent><div className="flex flex-wrap items-end gap-5"><div><p className="text-4xl font-semibold text-neutral-900">{healthScore}</p><p className="text-sm text-neutral-500">{t("intelligence.outOf100")}</p></div><div className="min-w-[260px] flex-1 space-y-2">{healthMetrics.map(metric=><div key={metric.label}><div className="flex justify-between text-xs"><span className="font-medium text-neutral-700">{metric.label}</span><span className="text-neutral-500">{metric.score}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{width:`${metric.score}%`}} /></div><p className="mt-0.5 text-[11px] text-neutral-400">{metric.detail}</p></div>)}</div></div></CardContent>
    </Card>

    <Card><CardHeader><CardTitle>{t("intelligence.examReadinessNext7Days")}</CardTitle></CardHeader><CardContent>{readiness.length===0?<p className="text-sm text-neutral-500">{t("emptyStates.noExamsNext7Days")}</p>:<div className="flex flex-col gap-3">{readiness.map(row=><div key={row.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900"><Bdi>{row.title}</Bdi></p><p className="text-xs text-neutral-500"><Bdi>{row.className}</Bdi> · <Bdi>{row.subjectName}</Bdi> · <Bdi>{row.teacherName}</Bdi> · <Bdi>{row.date}</Bdi></p></div><Badge variant={row.score===100?"success":row.score>=67?"warning":"danger"}>{row.score}% {t("intelligence.readyWord")}</Badge></div><Checklist row={row} t={t}/></div>)}</div>}</CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>{t("intelligence.dangerDetection")}</CardTitle></CardHeader><CardContent>{dangers.length===0?<p className="text-sm text-neutral-500">{t("intelligence.noActiveDangerSignals")}</p>:<ul className="flex flex-col gap-2">{dangers.map((danger,index)=><li key={`${danger.label}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 p-3"><div className="min-w-0"><p className="text-sm font-medium text-neutral-900">{danger.label}</p><p className="text-xs text-neutral-500">{danger.detail}</p></div><div className="flex items-center gap-2"><Badge variant={severityVariant[danger.severity]}>{danger.severity}</Badge>{danger.href&&<Link href={danger.href} className="text-xs font-medium text-primary-600">{t("intelligence.open")}</Link>}</div></li>)}</ul>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{t("intelligence.resultAnomalyDetection")}</CardTitle></CardHeader><CardContent>{anomalies.length===0?<p className="text-sm text-neutral-500">{t("intelligence.noUnusualPatterns")}</p>:<ul className="flex flex-col gap-2">{anomalies.map((anomaly,index)=><li key={`${anomaly.label}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 p-3"><div><p className="text-sm font-medium text-neutral-900">{anomaly.label}</p><p className="text-xs text-neutral-500">{anomaly.detail}</p></div><div className="flex gap-2"><Badge variant={severityVariant[anomaly.severity]}>{anomaly.severity}</Badge>{anomaly.href&&<Link href={anomaly.href} className="text-xs font-medium text-primary-600">{t("intelligence.review")}</Link>}</div></li>)}</ul>}</CardContent></Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>{t("intelligence.studentsNeedingAttention")}</CardTitle></CardHeader><CardContent>{studentRisks.length===0?<p className="text-sm text-neutral-500">{t("intelligence.noStudentEnoughData")}</p>:<ul className="flex flex-col gap-2">{studentRisks.map(student=><li key={student.id} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900"><Bdi>{student.name}</Bdi></p><p className="text-xs text-neutral-500"><Bdi>{student.className}</Bdi> · {t("intelligence.rollWord")} #<Bdi>{student.rollNo}</Bdi> · <Bdi>{student.failed}</Bdi> {t("intelligence.failedWord")}</p></div><Badge variant={student.score>=70?"danger":"warning"}>{student.score}/100 {t("intelligence.riskWord")}</Badge></div><p className="mt-1 text-xs text-neutral-500">{t("intelligence.averageLabel")}: {student.average==null?"—":`${student.average}%`} · {t("intelligence.weakLabel")}: {student.weakSubjects.length?student.weakSubjects.join(", "):t("intelligence.none")}</p></li>)}</ul>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{t("intelligence.topicFailureHeatmap")}</CardTitle></CardHeader><CardContent>{topicHeatmap.length===0?<p className="text-sm text-neutral-500">{t("intelligence.noTopicDataYet")}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="pb-2">{t("intelligence.topicColumn")}</th><th className="pb-2">{t("intelligence.subjectColumn")}</th><th className="pb-2">{t("intelligence.attemptsColumn")}</th><th className="pb-2">{t("intelligence.failRateColumn")}</th><th className="pb-2">{t("intelligence.avgColumn")}</th></tr></thead><tbody>{topicHeatmap.map(topic=><tr key={topic.topicId} className="border-b border-neutral-100 last:border-0"><td className="py-2 font-medium text-neutral-800"><Bdi>{topic.name}</Bdi></td><td className="py-2 text-neutral-600"><Bdi>{topic.subjectName}</Bdi></td><td className="py-2 text-neutral-600">{topic.attempts}</td><td className="py-2"><Badge variant={topic.failRate>=60?"danger":topic.failRate>=35?"warning":"success"}>{topic.failRate}%</Badge></td><td className="py-2 text-neutral-600">{topic.average}%</td></tr>)}</tbody></table></div>}</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>{t("intelligence.teacherComplianceVsOutcomes")}</CardTitle></CardHeader><CardContent>{teachers.length===0?<p className="text-sm text-neutral-500">{t("intelligence.noTeacherActivity")}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="pb-2">{t("intelligence.teacherColumn")}</th><th className="pb-2">{t("intelligence.papersColumn")}</th><th className="pb-2">{t("intelligence.testsColumn")}</th><th className="pb-2">{t("intelligence.resultsColumn")}</th><th className="pb-2">{t("intelligence.complianceColumn")}</th><th className="pb-2">{t("intelligence.studentPassRateColumn")}</th></tr></thead><tbody>{teachers.map(teacher=><tr key={teacher.id} className="border-b border-neutral-100 last:border-0"><td className="py-2 font-medium text-neutral-800"><Bdi>{teacher.name}</Bdi></td><td className="py-2 text-neutral-600">{teacher.papers}/{teacher.scheduled}</td><td className="py-2 text-neutral-600">{teacher.completed}/{teacher.scheduled}</td><td className="py-2 text-neutral-600">{teacher.results}/{teacher.completed||"—"}</td><td className="py-2"><Badge variant={teacher.score>=90?"success":teacher.score>=70?"warning":"danger"}>{teacher.score}%</Badge></td><td className="py-2 text-neutral-600">{teacher.outcomePassRate==null?"—":`${teacher.outcomePassRate}%`}</td></tr>)}</tbody></table></div>}</CardContent></Card>

    <Card><CardHeader><CardTitle>{t("intelligence.interventionEffectivenessTitle")}</CardTitle></CardHeader><CardContent>{interventionEffectiveness.length===0?<p className="text-sm text-neutral-500">{t("intelligence.completeFollowUpPrompt")}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="pb-2">{t("intelligence.studentColumn")}</th><th className="pb-2">{t("intelligence.actionColumn")}</th><th className="pb-2">{t("intelligence.followUpColumn")}</th><th className="pb-2">{t("intelligence.beforeColumn")}</th><th className="pb-2">{t("intelligence.afterColumn")}</th><th className="pb-2">{t("intelligence.changeColumn")}</th><th className="pb-2">{t("intelligence.outcomeColumn")}</th></tr></thead><tbody>{interventionEffectiveness.map(item=><tr key={item.id} className="border-b border-neutral-100 last:border-0"><td className="py-2 font-medium text-neutral-800"><Bdi>{item.studentName}</Bdi></td><td className="py-2 text-neutral-600"><Bdi>{item.action}</Bdi></td><td className="py-2 text-neutral-600"><Bdi>{item.followUpDate}</Bdi></td><td className="py-2 text-neutral-600">{item.beforeAverage==null?"—":`${item.beforeAverage}%`}</td><td className="py-2 text-neutral-600">{item.afterAverage==null?"—":`${item.afterAverage}%`}</td><td className="py-2"><Badge variant={item.improvement==null?"neutral":item.improvement>=5?"success":item.improvement>0?"warning":"danger"}>{formatDelta(item.improvement)}</Badge></td><td className="max-w-[220px] truncate py-2 text-neutral-600">{item.outcome??t("intelligence.pending")}</td></tr>)}</tbody></table></div>}</CardContent></Card>
  </main>;
}
