"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import type { AttendanceStatus } from "@/types/attendance";

export interface AttendanceInputRecord {
  student_id: string;
  status: AttendanceStatus;
  note?: string;
}

function assertAttendanceStatus(value: string): asserts value is AttendanceStatus {
  if (!["present", "absent", "late", "leave", "excused"].includes(value)) {
    throw new Error("Invalid attendance status");
  }
}

export async function submitClassAttendance(input: {
  class_id: string;
  section_id: string;
  attendance_date: string;
  records: AttendanceInputRecord[];
}) {
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "academic_coordinator", "principal", "owner"].includes(profile.role)) {
    return { ok: false as const, error: "not_authorized" };
  }

  input.records.forEach((record) => assertAttendanceStatus(record.status));

  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_attendance", {
    p_class_id: input.class_id,
    p_section_id: input.section_id,
    p_attendance_date: input.attendance_date,
    p_records: input.records
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/teacher/attendance");
  revalidatePath("/coordinator/attendance");
  revalidatePath("/principal/attendance");
  revalidatePath("/owner/attendance");
  return { ok: true as const, sessionId: data as string };
}

export async function saveStaffAttendance(input: {
  attendance_date: string;
  records: { staff_id: string; status: AttendanceStatus; note?: string }[];
}) {
  const profile = await getCurrentProfile();
  if (!profile || !["academic_coordinator", "clerk"].includes(profile.role)) {
    return { ok: false as const, error: "not_authorized" };
  }
  input.records.forEach((record) => assertAttendanceStatus(record.status));

  const supabase = createClient();
  const rows = input.records.map((record) => ({
    attendance_date: input.attendance_date,
    staff_id: record.staff_id,
    status: record.status,
    note: record.note?.trim() || null,
    marked_by: profile.user_id,
    marked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase.from("staff_attendance").upsert(rows, { onConflict: "attendance_date,staff_id" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/clerk/attendance");
  revalidatePath("/coordinator/attendance");
  revalidatePath("/principal/attendance");
  revalidatePath("/owner/attendance");
  return { ok: true as const };
}

export async function reopenClassAttendance(sessionId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !["academic_coordinator", "principal", "owner"].includes(profile.role)) {
    return { ok: false as const, error: "not_authorized" };
  }
  const supabase = createClient();
  const { error } = await supabase.rpc("reopen_attendance", { p_session_id: sessionId });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/teacher/attendance");
  revalidatePath("/coordinator/attendance");
  revalidatePath("/principal/attendance");
  revalidatePath("/owner/attendance");
  return { ok: true as const };
}
