import type { Profile } from "@/types/database";
import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";
import { createClient } from "@/lib/supabase/server";
import { OwnerNotificationsOverview } from "@/components/owner/owner-notifications-overview";

import { resolveAlert } from "./actions";

/**
 * Owner-side notification command center. The alerts table is populated
 * automatically by the compliance scan; this page only presents the live
 * school-wide signal and lets the owner resolve an alert.
 */
export default async function OwnerAlertsPage() {
  const supabase = createClient();

  const [alertsRes, profilesRes] = await Promise.all([
    supabase.from("alerts").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "teacher")
  ]);

  const alerts = (alertsRes.data as AlertRow[] | null) ?? [];
  const teachers = (profilesRes.data as Profile[] | null) ?? [];

  const teacherNameById = new Map<string, string>();
  for (const teacher of teachers) {
    teacherNameById.set(teacher.id, teacher.full_name);
    teacherNameById.set(teacher.user_id, teacher.full_name);
  }

  const enriched: AlertWithTeacher[] = alerts.map((alert) => ({
    ...alert,
    teacherName: alert.teacher_id ? teacherNameById.get(alert.teacher_id) ?? null : null
  }));

  const open = enriched.filter((alert) => alert.status === "open");
  const resolved = enriched.filter((alert) => alert.status === "resolved");

  return (
    <OwnerNotificationsOverview
      open={open}
      resolved={resolved}
      onResolve={resolveAlert}
    />
  );
}
