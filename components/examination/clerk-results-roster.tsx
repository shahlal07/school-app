"use client";

import { useMemo, useState, useTransition } from "react";
import { uploadClerkResults } from "@/app/clerk/marks/actions";

interface Student { id:string; roll_no:string; name:string; }
interface Existing { student_id:string; marks_obtained:number|null; total_marks:number; is_absent:boolean; }

export function ClerkResultsRoster({ scheduleItemId, students, existingResults, teacherName }: { scheduleItemId:string; students:Student[]; existingResults:Existing[]; teacherName:string }) {
  const existing = useMemo(() => new Map(existingResults.map(r => [r.student_id, r])), [existingResults]);
  const [totalMarks, setTotalMarks] = useState(String(existingResults[0]?.total_marks ?? 10));
  const [rows, setRows] = useState(() => Object.fromEntries(students.map(s => { const r=existing.get(s.id); return [s.id,{ marks:r?.marks_obtained == null ? "" : String(r.marks_obtained), absent:r?.is_absent ?? false }]; })));
  const [pending,startTransition] = useTransition(); const [error,setError]=useState<string|null>(null); const [saved,setSaved]=useState(false);
  function save(){
    setError(null); setSaved(false); const total=Number(totalMarks);
    if(!Number.isFinite(total)||total<=0){setError("Total marks must be positive.");return;}
    const payload=students.map(s=>{const r=rows[s.id];const n=r.marks.trim()===""?null:Number(r.marks);return{student_id:s.id,marks_obtained:r.absent?null:n,is_absent:r.absent};});
    if(payload.some(r=>!r.is_absent&&(r.marks_obtained===null||!Number.isFinite(r.marks_obtained)||r.marks_obtained<0||r.marks_obtained>total))){setError(`Marks must be between 0 and ${total}.`);return;}
    startTransition(async()=>{const result=await uploadClerkResults(scheduleItemId,total,payload);if(result.error){setError(result.error);return;}setSaved(true);});
  }
  return <div className="flex flex-col gap-4"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Entering marks on behalf of {teacherName}</p><p className="mt-1 text-xs text-amber-800">The database records the clerk as the actual actor; the schedule teacher remains the responsible teacher.</p></div><label className="w-40 text-sm font-medium text-neutral-700">Total marks<input type="number" min="1" value={totalMarks} onChange={e=>setTotalMarks(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"/></label><div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="min-w-full text-sm"><thead className="border-b bg-neutral-50 text-left text-neutral-500"><tr><th className="p-3">Roll</th><th className="p-3">Student</th><th className="p-3">Marks</th><th className="p-3">Absent</th></tr></thead><tbody>{students.map(s=>{const r=rows[s.id];return <tr key={s.id} className="border-b last:border-0"><td className="p-3">{s.roll_no}</td><td className="p-3 font-medium">{s.name}</td><td className="p-3"><input type="number" min="0" disabled={r.absent} value={r.marks} onChange={e=>setRows(prev=>({...prev,[s.id]:{...prev[s.id],marks:e.target.value}}))} className="w-28 rounded-lg border border-neutral-300 px-3 py-2"/></td><td className="p-3"><input type="checkbox" checked={r.absent} onChange={e=>setRows(prev=>({...prev,[s.id]:{...prev[s.id],absent:e.target.checked,marks:e.target.checked?"":prev[s.id].marks}}))}/></td></tr>})}</tbody></table></div>{error&&<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{saved&&<p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Results saved.</p>}<button type="button" onClick={save} disabled={pending||students.length===0} className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending?"Saving…":"Save results"}</button></div>;
}
