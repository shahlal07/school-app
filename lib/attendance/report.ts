import { createClient } from "@/lib/supabase/server";
import type { DailyAttendanceReportRow, AttendanceStatus } from "@/types/attendance";
import type { MissingAttendanceRow } from "@/components/attendance/daily-attendance-report";

export function pakistanDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function getDailyAttendanceReport(date: string) {
  const supabase = createClient();
  const [{ data: rows }, { data: assignments }, { data: classes }, { data: sections }, { data: profiles }] = await Promise.all([
    supabase.from("attendance_daily_report").select("*").eq("attendance_date", date).order("class_name").order("section_name"),
    supabase.from("class_teachers").select("class_id,section_id,teacher_id"),
    supabase.from("classes").select("id,name"),
    supabase.from("sections").select("id,name"),
    supabase.from("profiles").select("user_id,full_name")
  ]);

  const reportRows = (rows ?? []) as DailyAttendanceReportRow[];
  const classById = new Map((classes ?? []).map((row) => [row.id, row.name]));
  const sectionById = new Map((sections ?? []).map((row) => [row.id, row.name]));
  const profileByUserId = new Map((profiles ?? []).map((row) => [row.user_id, row.full_name]));
  const submitted = new Set(reportRows.map((row) => `${row.class_id}:${row.section_id}`));
  const missing: MissingAttendanceRow[] = [];

  for (const assignment of assignments ?? []) {
    const key = `${assignment.class_id}:${assignment.section_id}`;
    if (!submitted.has(key)) {
      missing.push({
        className: classById.get(assignment.class_id) ?? "Class",
        sectionName: sectionById.get(assignment.section_id) ?? "Section",
        teacherName: profileByUserId.get(assignment.teacher_id) ?? "Assigned teacher"
      });
    }
  }

  return { rows: reportRows, missing, supabase };
}

export async function getStaffAttendance(date: string) {
  const supabase = createClient();
  const [{ data: staff }, { data: records }] = await Promise.all([
    supabase.from("profiles").select("user_id,full_name,designation,role").eq("is_active", true).neq("role", "owner").order("full_name"),
    supabase.from("staff_attendance").select("staff_id,status").eq("attendance_date", date)
  ]);
  const existing: Record<string, AttendanceStatus> = {};
  (records ?? []).forEach((row) => { existing[row.staff_id] = row.status as AttendanceStatus; });
  return { staff: staff ?? [], existing };
}
