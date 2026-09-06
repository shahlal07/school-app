"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { saveExamResults, submitExamPaper } from "../actions";

type ResultRow = { student_id: string; marks_obtained: number | null; is_absent: boolean; total_marks: number };
type StudentRow = { id: string; roll_no: string; name: string };
type PaperRow = { id: string; status: string; file_path: string | null; submitted_at: string | null } | null;
type ExamRow = { id: string; title: string; scheduled_date: string };

interface Props { exam: ExamRow; students: StudentRow[]; paper: PaperRow; results: ResultRow[]; }

function WorkspaceInner({ exam, students, paper, results }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const resultMap = new Map<string, ResultRow>(results.map((r) => [r.student_id, r]));
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(students.map((s) => [s.id, resultMap.get(s.id)?.marks_obtained?.toString() ?? ""])));
  const [absent, setAbsent] = useState<Record<string, boolean>>(() => Object.fromEntries(students.map((s) => [s.id, Boolean(resultMap.get(s.id)?.is_absent)])));

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setUploading(true);
    const result = await submitExamPaper(exam.id, new FormData(form));
    setUploading(false);
    if (result.error) return toast(result.error, "danger");
    toast("Exam paper uploaded. Clerk and coordinator can now see it.", "success");
    form.reset();
    router.refresh();
  }

  async function saveResults() {
    setSaving(true);
    const result = await saveExamResults(exam.id, students.map((s) => ({ studentId: s.id, marks: marks[s.id] ?? "", absent: Boolean(absent[s.id]) })));
    setSaving(false);
    if (result.error) return toast(result.error, "danger");
    toast("Student marks saved.", "success");
    router.refresh();
  }

  return <main className="p-4 sm:p-6 pb-24">
    <h1 className="text-xl font-semibold text-neutral-900">{exam.title}</h1>
    <p className="mt-1 text-sm text-neutral-500">Scheduled {exam.scheduled_date}</p>
    <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold">Exam paper</h2>
      <p className="mt-1 text-sm text-neutral-500">Upload the final paper for the clerk to place into printing.</p>
      {paper && <p className="mt-3 text-xs text-neutral-600">Current status: <span className="font-medium">{paper.status}</span></p>}
      <form onSubmit={upload} className="mt-4 flex flex-col gap-3"><input name="file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required className="block w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm" /><Button type="submit" loading={uploading}>Upload paper</Button></form>
    </section>
    <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Student marks</h2><p className="mt-1 text-sm text-neutral-500">Enter marks out of 100 or mark absent.</p></div><Button onClick={saveResults} loading={saving}>Save marks</Button></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-neutral-500"><th className="px-2 py-2">Roll</th><th className="px-2 py-2">Student</th><th className="px-2 py-2">Marks</th><th className="px-2 py-2">Absent</th></tr></thead><tbody>{students.map((student) => <tr key={student.id} className="border-b last:border-0"><td className="px-2 py-2">{student.roll_no}</td><td className="px-2 py-2 font-medium">{student.name}</td><td className="px-2 py-2"><input aria-label={`Marks for ${student.name}`} inputMode="decimal" disabled={absent[student.id]} value={marks[student.id] ?? ""} onChange={(e) => setMarks((v) => ({ ...v, [student.id]: e.target.value }))} className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5" /></td><td className="px-2 py-2"><input type="checkbox" checked={Boolean(absent[student.id])} onChange={(e) => setAbsent((v) => ({ ...v, [student.id]: e.target.checked }))} /></td></tr>)}</tbody></table></div>
    </section>
  </main>;
}

export function TeacherExamWorkspace(props: Props) { return <ToastProvider><WorkspaceInner {...props} /></ToastProvider>; }
