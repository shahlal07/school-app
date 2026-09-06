import { createClient } from "@/lib/supabase/server";

export interface TeacherAttendanceComplianceRow {
  teacher_id: string;
  teacher_name: string;
  expected_class_days: number;
  submitted_class_days: number;
  missed_class_days: number;
  compliance_percentage: number;
}

export async function getTeacherAttendanceCompliance(days = 14) {
  const supabase = createClient();
  const start = new Date(Date.now() - (days - 1) * 86400000);
  const startDate = start.toISOString().slice(0, 10);
  const [{ data: assignments }, { data: attendance }, { data: teachers }] = await Promise.all([
    supabase.from("class_teachers").select("teacher_id,class_id,section_id"),
    supabase.from("attendance_sessions").select("class_id,section_id,attendance_date,status").gte("attendance_date", startDate).eq("status", "submitted"),
    supabase.from("profiles").select("user_id,full_name").eq("role", "teacher").eq("is_active", true)
  ]);

  const teacherNames = new Map((teachers ?? []).map((teacher) => [teacher.user_id, teacher.full_name]));
  const submitted = new Set((attendance ?? []).map((row) => `${row.class_id}:${row.section_id}:${row.attendance_date}`));
  const weekdays: string[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start.getTime() + offset * 86400000);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) weekdays.push(date.toISOString().slice(0, 10));
  }

  const totals = new Map<string, { expected: number; submitted: number }>();
  for (const assignment of assignments ?? []) {
    const current = totals.get(assignment.teacher_id) ?? { expected: 0, submitted: 0 };
    for (const date of weekdays) {
      current.expected += 1;
      if (submitted.has(`${assignment.class_id}:${assignment.section_id}:${date}`)) current.submitted += 1;
    }
    totals.set(assignment.teacher_id, current);
  }

  return Array.from(totals.entries())
    .map(([teacher_id, value]) => ({
      teacher_id,
      teacher_name: teacherNames.get(teacher_id) ?? "Teacher",
      expected_class_days: value.expected,
      submitted_class_days: value.submitted,
      missed_class_days: value.expected - value.submitted,
      compliance_percentage: value.expected ? Math.round((value.submitted / value.expected) * 1000) / 10 : 100
    }))
    .sort((a, b) => a.compliance_percentage - b.compliance_percentage);
}
