"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Student } from "@/types/examination";
import type { ExamAttendanceStatus } from "@/types/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { saveTestResults, type TestResultInput } from "@/app/teacher/exams/[id]/actions";
import { submitResultsForReview } from "@/app/teacher/exams/[id]/result-actions";

export interface ExistingTestResult { student_id:string; marks_obtained:number|null; total_marks:number; is_absent:boolean; is_pass:boolean|null; }
export interface ExamResultsRosterProps { scheduleItemId:string; students:Student[]; existingResults:ExistingTestResult[]; examAttendance?:Record<string,ExamAttendanceStatus>; }
interface RowState { marks:string; absent:boolean; isPass:boolean|null; }

function ExamResultsRosterInner({scheduleItemId,students,existingResults,examAttendance={}}:ExamResultsRosterProps){
 const router=useRouter(); const {toast}=useToast(); const resultByStudent=useMemo(()=>new Map(existingResults.map(r=>[r.student_id,r])),[existingResults]);
 const sortedStudents=useMemo(()=>[...students].sort((a,b)=>a.roll_no.localeCompare(b.roll_no,undefined,{numeric:true})),[students]);
 const [totalMarks,setTotalMarks]=useState(String(existingResults[0]?.total_marks??10)); const [saving,setSaving]=useState(false); const [submitting,setSubmitting]=useState(false); const [search,setSearch]=useState("");
 const [rows,setRows]=useState<Record<string,RowState>>(()=>Object.fromEntries(students.map(s=>{const r=resultByStudent.get(s.id); const examAbsent=examAttendance[s.id]==="absent"; return [s.id,{marks:r?.marks_obtained!=null?String(r.marks_obtained):"",absent:examAbsent||(r?.is_absent??false),isPass:r?.is_pass??null}] })));
 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return q?sortedStudents.filter(s=>s.name.toLowerCase().includes(q)||s.roll_no.toLowerCase().includes(q)):sortedStudents},[sortedStudents,search]);
 const update=(id:string,patch:Partial<RowState>)=>{if(examAttendance[id]==="absent"&&patch.absent===false)return;setRows(prev=>({...prev,[id]:{...prev[id],...patch}}));};
 const save=async()=>{const total=Number(totalMarks);if(!Number.isFinite(total)||total<=0){toast("Enter a valid total marks value first.","danger");return;}setSaving(true);const payload:TestResultInput[]=sortedStudents.map(s=>{const r=rows[s.id];const n=r.marks.trim()===""?null:Number(r.marks);return{studentId:s.id,isAbsent:r.absent,marksObtained:r.absent||n===null||!Number.isFinite(n)?null:n}});const result=await saveTestResults(scheduleItemId,total,payload);setSaving(false);if(result.error){toast(result.error,"danger");return;}toast("Results saved","success");router.refresh();};
 const submit=async()=>{setSubmitting(true);const result=await submitResultsForReview(scheduleItemId);setSubmitting(false);if(result.error){toast(result.error,"danger");return;}toast("Results submitted for coordinator review","success");router.refresh();};
 if(!sortedStudents.length)return <p className="text-sm text-neutral-500">No students found for this class.</p>;
 return <div className="flex flex-col gap-3"><div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]"><Input label="Total marks" type="number" min={1} value={totalMarks} onChange={e=>setTotalMarks(e.target.value)}/><Input label="Search students" type="search" placeholder="Roll number or name..." value={search} onChange={e=>setSearch(e.target.value)}/></div><ul className="flex flex-col gap-2">{visible.map(student=>{const row=rows[student.id];const examAbsent=examAttendance[student.id]==="absent";return <li key={student.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900">{student.name}</p><p className="text-xs text-neutral-500">Roll #{student.roll_no}</p></div>{examAbsent?<Badge variant="neutral">Exam absent · result not required</Badge>:row.isPass!==null&&!row.absent&&<Badge variant={row.isPass?"success":"danger"}>{row.isPass?"Pass":"Fail"}</Badge>}</div><div className="flex flex-wrap items-center gap-3">{!examAbsent&&<div className="w-28"><Input label="Marks" type="number" min={0} disabled={row.absent} value={row.marks} onChange={e=>update(student.id,{marks:e.target.value})}/></div>}{!examAbsent&&<label className="flex items-center gap-2 pt-5 text-sm text-neutral-700"><input type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary-600" checked={row.absent} onChange={e=>update(student.id,{absent:e.target.checked,marks:e.target.checked?"":row.marks})}/>Absent</label>}</div></li>})}</ul><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" loading={saving} onClick={save}>Save all</Button><Button type="button" variant="primary" loading={submitting} onClick={submit}>Submit results for review</Button></div></div>;
}
export function ExamResultsRoster(props:ExamResultsRosterProps){return <ToastProvider><ExamResultsRosterInner {...props}/></ToastProvider>}
