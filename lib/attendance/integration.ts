import { createClient } from "@/lib/supabase/server";
import type { AttendanceAcademicSignal, ExamAttendanceReconciliationRow } from "@/types/attendance";

export async function getAttendanceAcademicSignals(limit = 12) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attendance_academic_signal")
    .select("student_id,class_id,section_id,roll_no,name,attendance_percentage,assessment_percentage,marks_sum,possible_sum,signal")
    .in("signal", ["attendance_and_academic", "attendance_primary", "academic_despite_attendance"])
    .order("attendance_percentage", { ascending: true })
    .limit(limit);
  if (error) return { rows: [] as AttendanceAcademicSignal[], error: error.message };
  return { rows: (data ?? []) as AttendanceAcademicSignal[], error: null };
}

export async function getExamAttendanceExceptions(limit = 12) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exam_attendance_reconciliation")
    .select("schedule_item_id,class_id,subject_id,scheduled_date,title,section_id,student_id,roll_no,name,exam_attendance_status,result_id,result_absent,marks_obtained,total_marks,result_expected,missing_result_after_exam_presence")
    .eq("missing_result_after_exam_presence", true)
    .order("scheduled_date", { ascending: false })
    .limit(limit);
  if (error) return { rows: [] as ExamAttendanceReconciliationRow[], error: error.message };
  return { rows: (data ?? []) as ExamAttendanceReconciliationRow[], error: null };
}

export async function getAttendanceTrend(days = 14) {
  const supabase = createClient();
  const start = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("attendance_daily_report")
    .select("attendance_date,total_students,present_count,absent_count,late_count")
    .gte("attendance_date", start)
    .order("attendance_date", { ascending: true });
  if (error) return { rows: [] as { attendance_date: string; attendance_percentage: number; total_students: number; absent_count: number }[], error: error.message };

  const byDate = new Map<string, { total: number; present: number; absent: number }>();
  for (const row of data ?? []) {
    const current = byDate.get(row.attendance_date) ?? { total: 0, present: 0, absent: 0 };
    current.total += Number(row.total_students ?? 0);
    current.present += Number(row.present_count ?? 0);
    current.absent += Number(row.absent_count ?? 0);
    byDate.set(row.attendance_date, current);
  }
  return {
    rows: Array.from(byDate.entries()).map(([attendance_date, value]) => ({
      attendance_date,
      total_students: value.total,
      absent_count: value.absent,
      attendance_percentage: value.total ? Math.round((value.present / value.total) * 1000) / 10 : 0
    })),
    error: null
  };
}
