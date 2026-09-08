import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/types/attendance";

export async function getTeacherAttendanceWorkspace(teacherId: string, selectedClassId?: string, selectedSectionId?: string) {
  const supabase = createClient();
  const [{ data: assignments }, { data: classes }, { data: sections }] = await Promise.all([
    supabase.from("class_teachers").select("class_id,section_id").eq("teacher_id", teacherId),
    supabase.from("classes").select("id,name").order("name"),
    supabase.from("sections").select("id,name").order("name")
  ]);
  const valid = (assignments ?? []).map((a) => ({
    classId: a.class_id,
    sectionId: a.section_id,
    className: classes?.find((c) => c.id === a.class_id)?.name ?? "Class",
    sectionName: sections?.find((s) => s.id === a.section_id)?.name ?? "Section"
  }));
  const selectedAssignment = valid.find((a) => a.classId === selectedClassId && a.sectionId === selectedSectionId) ?? valid[0];
  if (!selectedAssignment) return { options: [], selected: null };

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [{ data: students }, { data: session }] = await Promise.all([
    supabase.from("students").select("id,roll_no,name").eq("class_id", selectedAssignment.classId).eq("section_id", selectedAssignment.sectionId).eq("is_active", true).order("roll_no"),
    supabase.from("attendance_sessions").select("id,status").eq("attendance_date", today).eq("class_id", selectedAssignment.classId).eq("section_id", selectedAssignment.sectionId).maybeSingle()
  ]);
  const { data: records } = session?.id ? await supabase.from("attendance_records").select("student_id,status").eq("session_id", session.id) : { data: [] as { student_id: string; status: AttendanceStatus }[] };
  const existing: Record<string, AttendanceStatus> = {};
  for (const row of records ?? []) existing[row.student_id] = row.status as AttendanceStatus;
  const options = valid.map((item) => ({ ...item, studentCount: item.classId === selectedAssignment.classId && item.sectionId === selectedAssignment.sectionId ? (students ?? []).length : 0 }));
  return { options, selected: { ...selectedAssignment, students: (students ?? []).map((s) => ({ id: s.id, roll_no: s.roll_no, name: s.name })), existing, submitted: session?.status === "submitted" && Object.keys(existing).length === (students ?? []).length } };
}
