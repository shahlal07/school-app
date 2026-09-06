export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "excused";
export type AttendanceSessionStatus = "draft" | "submitted" | "reopened";
export type ExamAttendanceStatus = "present" | "absent" | "excused";

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

export interface ExamAttendanceSession {
  id: string;
  schedule_item_id: string;
  class_id: string;
  section_id: string | null;
  attendance_date: string;
  status: AttendanceSessionStatus;
  recorded_by: string;
  recorded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamAttendanceRecord {
  id: string;
  exam_attendance_session_id: string;
  student_id: string;
  roll_no_snapshot: string;
  status: ExamAttendanceStatus;
  note: string | null;
  marked_at: string;
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

export interface AttendanceAcademicSignal {
  student_id: string;
  class_id: string;
  section_id: string;
  roll_no: string;
  name: string;
  attendance_percentage: number | null;
  assessment_percentage: number | null;
  marks_sum: number;
  possible_sum: number;
  signal: "attendance_and_academic" | "attendance_primary" | "academic_despite_attendance" | "normal";
}

export interface ExamAttendanceReconciliationRow {
  schedule_item_id: string;
  class_id: string;
  subject_id: string;
  scheduled_date: string;
  title: string;
  section_id: string;
  student_id: string;
  roll_no: string;
  name: string;
  exam_attendance_status: ExamAttendanceStatus | null;
  result_id: string | null;
  result_absent: boolean | null;
  marks_obtained: number | null;
  total_marks: number | null;
  result_expected: boolean | null;
  missing_result_after_exam_presence: boolean;
}
