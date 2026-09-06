import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function Checklist({row}:{row:ReadinessRow}){
  const items=[["Paper",row.paper],["Approved",row.approved],["Printed",row.printed],["Conducted",row.conducted],["Results",row.resultsComplete],["Final",row.resultsFinalized]] as const;
  return <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] sm:grid-cols-6">{items.map(([label,ok])=><span key={label} className={`rounded-md px-1.5 py-1 text-center ${ok?"bg-green-50 text-green-700":"bg-neutral-100 text-neutral-500"}`}>{ok?"✓":"○"} {label}</span>)}</div>;
}

export function AcademicIntelligence({roleLabel,readiness,dangers,studentRisks,teachers,healthMetrics,healthScore,dailyBrief,topicHeatmap,anomalies,interventionEffectiveness,interventionHref,resultsHref}:AcademicIntelligenceProps){
  return <main className="flex flex-col gap-5 p-4 sm:p-6">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-xl font-semibold text-neutral-900">Academic intelligence</h1><p className="mt-1 text-sm text-neutral-500">{roleLabel} view — what needs attention today, why, and what changed.</p></div>
      <div className="flex gap-2"><Link href={interventionHref} className="rounded-xl bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200">Interventions</Link><Link href={resultsHref} className="rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">Results pipeline</Link></div>
    </div>

    <Card>
      <CardHeader><CardTitle>Today at a glance</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-3 text-sm font-medium text-neutral-700">{dailyBrief.headline}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[["Today’s exams",dailyBrief.todayExams],["Urgent issues",dailyBrief.urgentIssues],["At-risk students",dailyBrief.atRiskStudents],["Ungraded today",dailyBrief.ungradedStudents],["Overdue teachers",dailyBrief.overdueTeachers]].map(([label,value])=><div key={String(label)} className="rounded-xl border border-neutral-200 p-3"><p className="text-2xl font-semibold text-neutral-900">{value}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></div>)}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>School Academic Health Score</CardTitle></CardHeader>
      <CardContent><div className="flex flex-wrap items-end gap-5"><div><p className="text-4xl font-semibold text-neutral-900">{healthScore}</p><p className="text-sm text-neutral-500">out of 100</p></div><div className="min-w-[260px] flex-1 space-y-2">{healthMetrics.map(metric=><div key={metric.label}><div className="flex justify-between text-xs"><span className="font-medium text-neutral-700">{metric.label}</span><span className="text-neutral-500">{metric.score}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{width:`${metric.score}%`}} /></div><p className="mt-0.5 text-[11px] text-neutral-400">{metric.detail}</p></div>)}</div></div></CardContent>
    </Card>

    <Card><CardHeader><CardTitle>Exam readiness — next 7 days</CardTitle></CardHeader><CardContent>{readiness.length===0?<p className="text-sm text-neutral-500">No exams are scheduled in the next 7 days.</p>:<div className="flex flex-col gap-3">{readiness.map(row=><div key={row.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">{row.title}</p><p className="text-xs text-neutral-500">{row.className} · {row.subjectName} · {row.teacherName} · {row.date}</p></div><Badge variant={row.score===100?"success":row.score>=67?"warning":"danger"}>{row.score}% ready</Badge></div><Checklist row={row}/></div>)}</div>}</CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Danger detection</CardTitle></CardHeader><CardContent>{dangers.length===0?<p className="text-sm text-neutral-500">No active academic danger signals.</p>:<ul className="flex flex-col gap-2">{dangers.map((danger,index)=><li key={`${danger.label}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 p-3"><div className="min-w-0"><p className="text-sm font-medium text-neutral-900">{danger.label}</p><p className="text-xs text-neutral-500">{danger.detail}</p></div><div className="flex items-center gap-2"><Badge variant={severityVariant[danger.severity]}>{danger.severity}</Badge>{danger.href&&<Link href={danger.href} className="text-xs font-medium text-primary-600">Open</Link>}</div></li>)}</ul>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Result anomaly detection</CardTitle></CardHeader><CardContent>{anomalies.length===0?<p className="text-sm text-neutral-500">No unusual result patterns detected.</p>:<ul className="flex flex-col gap-2">{anomalies.map((anomaly,index)=><li key={`${anomaly.label}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 p-3"><div><p className="text-sm font-medium text-neutral-900">{anomaly.label}</p><p className="text-xs text-neutral-500">{anomaly.detail}</p></div><div className="flex gap-2"><Badge variant={severityVariant[anomaly.severity]}>{anomaly.severity}</Badge>{anomaly.href&&<Link href={anomaly.href} className="text-xs font-medium text-primary-600">Review</Link>}</div></li>)}</ul>}</CardContent></Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Students needing attention</CardTitle></CardHeader><CardContent>{studentRisks.length===0?<p className="text-sm text-neutral-500">No student has enough graded data to flag yet.</p>:<ul className="flex flex-col gap-2">{studentRisks.map(student=><li key={student.id} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900">{student.name}</p><p className="text-xs text-neutral-500">{student.className} · Roll #{student.rollNo} · {student.failed} failed</p></div><Badge variant={student.score>=70?"danger":"warning"}>{student.score}/100 risk</Badge></div><p className="mt-1 text-xs text-neutral-500">Average: {student.average==null?"—":`${student.average}%`} · Weak: {student.weakSubjects.length?student.weakSubjects.join(", "):"none"}</p></li>)}</ul>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Topic failure heatmap</CardTitle></CardHeader><CardContent>{topicHeatmap.length===0?<p className="text-sm text-neutral-500">No topic-level graded data yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="pb-2">Topic</th><th className="pb-2">Subject</th><th className="pb-2">Attempts</th><th className="pb-2">Fail rate</th><th className="pb-2">Avg</th></tr></thead><tbody>{topicHeatmap.map(topic=><tr key={topic.topicId} className="border-b border-neutral-100 last:border-0"><td className="py-2 font-medium text-neutral-800">{topic.name}</td><td className="py-2 text-neutral-600">{topic.subjectName}</td><td className="py-2 text-neutral-600">{topic.attempts}</td><td className="py-2"><Badge variant={topic.failRate>=60?"danger":topic.failRate>=35?"warning":"success"}>{topic.failRate}%</Badge></td><td className="py-2 text-neutral-600">{topic.average}%</td></tr>)}</tbody></table></div>}</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Teacher compliance vs student outcomes</CardTitle></CardHeader><CardContent>{teachers.length===0?<p className="text-sm text-neutral-500">No teacher activity to score yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="pb-2">Teacher</th><th className="pb-2">Papers</th><th className="pb-2">Tests</th><th className="pb-2">Results</th><th className="pb-2">Compliance</th><th className="pb-2">Student pass rate</th></tr></thead><tbody>{teachers.map(teacher=><tr key={teacher.id} className="border-b border-neutral-100 last:border-0"><td className="py-2 font-medium text-neutral-800">{teacher.name}</td><td className="py-2 text-neutral-600">{teacher.papers}/{teacher.scheduled}</td><td className="py-2 text-neutral-600">{teacher.completed}/{teacher.scheduled}</td><td className="py-2 text-neutral-600">{teacher.results}/{teacher.completed||"—"}</td><td className="py-2"><Badge variant={teacher.score>=90?"success":teacher.score>=70?"warning":"danger"}>{teacher.score}%</Badge></td><td className="py-2 text-neutral-600">{teacher.outcomePassRate==null?"—":`${teacher.outcomePassRate}%`}</td></tr>)}</tbody></table></div>}</CardContent></Card>

    <Card><CardHeader><CardTitle>Intervention effectiveness</CardTitle></CardHeader><CardContent>{interventionEffectiveness.length===0?<p className="text-sm text-neutral-500">Complete an intervention follow-up to measure before/after improvement.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="pb-2">Student</th><th className="pb-2">Action</th><th className="pb-2">Follow-up</th><th className="pb-2">Before</th><th className="pb-2">After</th><th className="pb-2">Change</th><th className="pb-2">Outcome</th></tr></thead><tbody>{interventionEffectiveness.map(item=><tr key={item.id} className="border-b border-neutral-100 last:border-0"><td className="py-2 font-medium text-neutral-800">{item.studentName}</td><td className="py-2 text-neutral-600">{item.action}</td><td className="py-2 text-neutral-600">{item.followUpDate}</td><td className="py-2 text-neutral-600">{item.beforeAverage==null?"—":`${item.beforeAverage}%`}</td><td className="py-2 text-neutral-600">{item.afterAverage==null?"—":`${item.afterAverage}%`}</td><td className="py-2"><Badge variant={item.improvement==null?"neutral":item.improvement>=5?"success":item.improvement>0?"warning":"danger"}>{formatDelta(item.improvement)}</Badge></td><td className="max-w-[220px] truncate py-2 text-neutral-600">{item.outcome??"Pending"}</td></tr>)}</tbody></table></div>}</CardContent></Card>
  </main>;
}
