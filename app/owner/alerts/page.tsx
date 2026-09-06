import type { Profile } from "@/types/database";
import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";
import { createClient } from "@/lib/supabase/server";
import { AlertInbox } from "@/components/examination/alert-inbox";

import { resolveAlert } from "./actions";

/**
 * Owner-side compliance inbox. The `alerts` table is populated automatically
 * by the hourly scan_examination_compliance() Postgres job - this page only
 * displays and (via resolveAlert) resolves rows, it never generates them.
 * RLS lets the owner see every alert, so a plain unfiltered select is
 * correct and complete here.
 */
export default async function OwnerAlertsPage() {
  const supabase = createClient();

  const [alertsRes, profilesRes] = await Promise.all([
    supabase.from("alerts").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "teacher")
  ]);

  const alerts = (alertsRes.data as AlertRow[] | null) ?? [];
  const teachers = (profilesRes.data as Profile[] | null) ?? [];

  // alerts.teacher_id may reference either the profile row id or the
  // underlying auth user_id - index by both, same defensive join pattern
  // used for exam_papers/schedule_items elsewhere in this app.
  const teacherNameById = new Map<string, string>();
  for (const teacher of teachers) {
    teacherNameById.set(teacher.id, teacher.full_name);
    teacherNameById.set(teacher.user_id, teacher.full_name);
  }

  const enriched: AlertWithTeacher[] = alerts.map((alert) => ({
    ...alert,
    teacherName: alert.teacher_id ? teacherNameById.get(alert.teacher_id) ?? null : null
  }));

  const open = enriched.filter((a) => a.status === "open");
  const resolved = enriched.filter((a) => a.status === "resolved");

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Alerts</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Compliance issues detected automatically across papers, tests, and results.
      </p>

      <div className="mt-5">
        <AlertInbox open={open} resolved={resolved} onResolve={resolveAlert} />
      </div>
    </main>
  );
}
