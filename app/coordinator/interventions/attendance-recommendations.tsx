import { getAttendanceAcademicSignals } from "@/lib/attendance/integration";
import { createIntervention } from "./actions";
import type { AttendanceAcademicSignal } from "@/types/attendance";

function plusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function recommendation(signal: AttendanceAcademicSignal["signal"]) {
  if (signal === "attendance_and_academic") {
    return {
      action: "Attendance recovery + targeted academic support",
      notes: "Low attendance and low assessment performance. Review attendance barriers, provide catch-up work, and monitor the next assessment."
    };
  }
  if (signal === "attendance_primary") {
    return {
      action: "Attendance follow-up and catch-up plan",
      notes: "Attendance is below the school threshold. Identify the cause, restore attendance, and provide missed-learning recovery work."
    };
  }
  return {
    action: "Targeted academic intervention despite regular attendance",
    notes: "Student has strong attendance but weak assessment performance. Review teaching exposure, topic gaps, and provide targeted academic support."
  };
}

export async function AttendanceInterventionRecommendations({ canManage }: { canManage: boolean }) {
  if (!canManage) return null;
  const { rows } = await getAttendanceAcademicSignals(8);
  const dueDate = plusDays(7);
  const followUpDate = plusDays(14);

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40">
      <div className="border-b border-amber-100 px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Recommended actions</p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">Attendance ↔ academic interventions</h2>
        <p className="mt-1 text-xs text-neutral-600">These are recommendations, not automatic interventions. The coordinator decides whether to assign them.</p>
      </div>
      <div className="divide-y divide-amber-100">
        {rows.map((student) => {
          const rec = recommendation(student.signal);
          return (
            <div key={student.student_id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">#{student.roll_no} · {student.name}</p><p className="mt-1 text-xs text-neutral-600">Attendance {student.attendance_percentage ?? "—"}% · Assessment {student.assessment_percentage ?? "—"}%</p><p className="mt-1 text-xs text-neutral-700">{rec.notes}</p></div>
                <form action={createIntervention}>
                  <input type="hidden" name="studentId" value={student.student_id} />
                  <input type="hidden" name="subjectId" value="" />
                  <input type="hidden" name="assignedTo" value="" />
                  <input type="hidden" name="dueDate" value={dueDate} />
                  <input type="hidden" name="followUpDate" value={followUpDate} />
                  <input type="hidden" name="action" value={rec.action} />
                  <input type="hidden" name="notes" value={rec.notes} />
                  <button type="submit" className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">Assign recommended action</button>
                </form>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-neutral-600">No attendance-driven intervention recommendations right now.</div>}
      </div>
    </section>
  );
}
