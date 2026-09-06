export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "excused";
export type AttendanceSessionStatus = "draft" | "submitted" | "reopened";

export interface AttendanceSession {
  id: string;
  attendance_date: string;
  class_id: string;
  section_id: string;
  submitted_by: string;
  submitted_at: string | null;
  status: AttendanceSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  roll_no_snapshot: string;
  status: AttendanceStatus;
  note: string | null;
  marked_at: string;
}

export interface StaffAttendance {
  id: string;
  attendance_date: string;
  staff_id: string;
  status: AttendanceStatus;
  note: string | null;
  marked_by: string;
  marked_at: string;
  updated_at: string;
}

export interface DailyAttendanceReportRow {
  session_id: string;
  attendance_date: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  session_status: AttendanceSessionStatus;
  submitted_by: string;
  submitted_at: string | null;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
}
