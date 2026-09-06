"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

type Result = { error: string | null };

const HOLIDAY_TYPES = [
  "public",
  "religious",
  "school",
  "weather",
  "emergency",
  "teacher_training",
  "local",
  "custom"
] as const;

function revalidateCalendar(): void {
  revalidatePath("/coordinator/calendar");
}

/**
 * Mirrors the DB check constraint on calendar_overrides (holiday_type
 * required when day_status='holiday', must be null when 'working_day') so
 * the caller gets a clear message instead of a raw Postgres constraint
 * violation.
 */
export async function createCalendarOverride(formData: FormData): Promise<Result> {
  const profile = await requireRole("academic_coordinator");
  const supabase = createClient();

  const date = String(formData.get("date") ?? "").trim();
  const dayStatus = String(formData.get("dayStatus") ?? "").trim();
  const holidayType = String(formData.get("holidayType") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date) return { error: "Date is required." };
  if (!name) return { error: "Name is required." };
  if (dayStatus !== "holiday" && dayStatus !== "working_day") {
    return { error: "Day status must be either Holiday or Working day." };
  }
  if (dayStatus === "holiday" && !holidayType) {
    return { error: "Holiday type is required when day status is Holiday." };
  }
  if (dayStatus === "working_day" && holidayType) {
    return { error: "Holiday type must be left blank for a working day override." };
  }
  if (holidayType && !(HOLIDAY_TYPES as readonly string[]).includes(holidayType)) {
    return { error: "Invalid holiday type." };
  }

  const { data, error } = await supabase
    .from("calendar_overrides")
    .insert({
      date,
      day_status: dayStatus,
      holiday_type: dayStatus === "holiday" ? holidayType : null,
      name,
      notes,
      created_by: profile.user_id
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (data) {
    await logAudit({
      actorId: profile.user_id,
      action: "calendar_override_created",
      entityType: "calendar_overrides",
      entityId: data.id,
      newData: { date, day_status: dayStatus, holiday_type: holidayType, name, notes }
    });
  }

  revalidateCalendar();
  return { error: null };
}

export async function deleteCalendarOverride(id: string): Promise<Result> {
  const profile = await requireRole("academic_coordinator");
  const supabase = createClient();

  const { data: old } = await supabase
    .from("calendar_overrides")
    .select("date,day_status,holiday_type,name,notes")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("calendar_overrides").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.user_id,
    action: "calendar_override_deleted",
    entityType: "calendar_overrides",
    entityId: id,
    oldData: old ?? null
  });

  revalidateCalendar();
  return { error: null };
}

export interface ExamDayLookupResult {
  error: string | null;
  eligibleDate: string | null;
  isEligible: boolean | null;
  reason: string | null;
}

/**
 * Backs the "next eligible exam day" utility widget. Available to both
 * owner and coordinator (read-only, no side effects), so this deliberately
 * uses requireAnyRole-equivalent access by not gating on a specific role at
 * all - anyone who can reach /coordinator/calendar (owner or
 * academic_coordinator, enforced by the layout guard) can call it. The two
 * RPCs it wraps are themselves SECURITY DEFINER + authenticated-only, so
 * there is no privilege escalation risk in leaving this ungated.
 */
export async function findNextEligibleExamDay(fromDate: string): Promise<ExamDayLookupResult> {
  if (!fromDate) {
    return { error: "A start date is required.", eligibleDate: null, isEligible: null, reason: null };
  }
  const supabase = createClient();

  const { data: nextDate, error: nextDateError } = await supabase.rpc("next_eligible_exam_day", {
    p_from: fromDate
  });
  if (nextDateError) {
    return { error: nextDateError.message, eligibleDate: null, isEligible: null, reason: null };
  }

  const { data: statusRows, error: statusError } = await supabase.rpc("get_exam_day_status", {
    p_date: nextDate
  });
  if (statusError) {
    return { error: statusError.message, eligibleDate: nextDate ?? null, isEligible: null, reason: null };
  }

  const status = (Array.isArray(statusRows) ? statusRows[0] : statusRows) as
    | { is_eligible: boolean; reason: string }
    | undefined;

  return {
    error: null,
    eligibleDate: nextDate ?? null,
    isEligible: status?.is_eligible ?? null,
    reason: status?.reason ?? null
  };
}
