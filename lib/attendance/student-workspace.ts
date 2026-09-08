import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/types/attendance";

export async function getStudentAttendanceWorkspace(selectedClassId?: string, selectedSectionId?: string) {
  const supabase = createClient();
  const [{ data: classes }, { data: sections }, { data: assignments }, { data: students }] = await Promise.all([
    supabase.from("classes").select("id,name,grade,group_name").order("name"),
    supabase.from("sections").select("id,name").order("name"),
    supabase.from("class_teachers").select("class_id,section_id,teacher_id"),
    supabase.from("students").select("id,class_id,section_id,roll_no,name").eq("is_active", true).order("roll_no")
  ]);

  const classById = new Map((classes ?? []).map((row) => [row.id, row]));
  const sectionById = new Map((sections ?? []).map((row) => [row.id, row]));
  const teacherIds = Array.from(new Set((assignments ?? []).map((row) => row.teacher_id)));
  const { data: teachers } = teacherIds.length
    ? await supabase.from("profiles").select("user_id,full_name").in("user_id", teacherIds)
    : { data: [] as { user_id: string; full_name: string }[] };
  const teacherById = new Map((teachers ?? []).map((row) => [row.user_id, row.full_name]));

  const keys = new Map<string, { classId: string; sectionId: string; className: string; sectionName: string; studentCount: number; teacherName?: string }>();
  for (const student of students ?? []) {
    const classRow = classById.get(student.class_id);
    const sectionRow = sectionById.get(student.section_id);
    if (!classRow || !sectionRow) continue;
    const key = `${student.class_id}:${student.section_id}`;
    if (!keys.has(key)) {
      const assignment = (assignments ?? []).find((row) => row.class_id === student.class_id && row.section_id === student.section_id);
      keys.set(key, { classId: student.class_id, sectionId: student.section_id, className: classRow.name, sectionName: sectionRow.name, studentCount: 0, teacherName: assignment ? teacherById.get(assignment.teacher_id) : undefined });
    }
    keys.get(key)!.studentCount += 1;
  }

  const options = Array.from(keys.values()).sort((a, b) => `${a.className}${a.sectionName}`.localeCompare(`${b.className}${b.sectionName}`));
  let selected = null;
  if (selectedClassId && selectedSectionId) {
    const option = options.find((row) => row.classId === selectedClassId && row.sectionId === selectedSectionId);
    if (option) {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const selectedStudents = (students ?? []).filter((row) => row.class_id === selectedClassId && row.section_id === selectedSectionId).map((row) => ({ id: row.id, roll_no: row.roll_no, name: row.name }));
      const { data: session } = await supabase.from("attendance_sessions").select("id,status").eq("attendance_date", today).eq("class_id", selectedClassId).eq("section_id", selectedSectionId).maybeSingle();
      const { data: records } = session?.id ? await supabase.from("attendance_records").select("student_id,status").eq("session_id", session.id) : { data: [] as { student_id: string; status: AttendanceStatus }[] };
      const existing: Record<string, AttendanceStatus> = {};
      for (const row of records ?? []) existing[row.student_id] = row.status as AttendanceStatus;
      selected = { ...option, students: selectedStudents, existing, submitted: session?.status === "submitted" && Object.keys(existing).length === selectedStudents.length };
    }
  }
  return { options, selected };
}
