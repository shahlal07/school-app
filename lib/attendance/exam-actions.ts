"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ExamAttendanceStatus } from "@/types/attendance";

const ALLOWED: ExamAttendanceStatus[] = ["present", "absent", "excused"];

export async function submitExamAttendance(input: {
  scheduleItemId: string;
  records: { studentId: string; rollNo: string; status: ExamAttendanceStatus; note?: string }[];
}) {
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "academic_coordinator", "principal", "owner"].includes(profile.role)) {
    return { ok: false as const, error: "not_authorized" };
  }

  if (!input.records.length || input.records.some((r) => !ALLOWED.includes(r.status))) {
    return { ok: false as const, error: "invalid_records" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_exam_attendance", {
    p_schedule_item_id: input.scheduleItemId,
    p_records: input.records.map((record) => ({
      student_id: record.studentId,
      roll_no: record.rollNo,
      status: record.status,
      note: record.note?.trim() || ""
    }))
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teacher/exams/${input.scheduleItemId}`);
  revalidatePath("/teacher");
  revalidatePath("/coordinator/attendance");
  revalidatePath("/principal/attendance");
  revalidatePath("/owner/attendance");
  return { ok: true as const, sessionId: data as string };
}
