import type { Profile } from "@/types/database";
import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";
import { createClient } from "@/lib/supabase/server";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCard } from "@/components/examination/alert-card";

/**
 * Read-only mirror of app/owner/alerts/page.tsx, using the same query
 * pattern (principal has can_view_school_wide() read access to the alerts
 * table). Deliberately does NOT reuse <AlertInbox> - that component always
 * wires an onResolve handler into its "open" tab. <AlertCard> itself
 * already treats onResolve as optional (no Resolve button is rendered
 * without one - see components/examination/alert-card.tsx), so this page
 * composes AlertCard + Tabs directly instead of adding a readOnly prop to
 * AlertInbox, keeping that owner-tested component untouched. Resolving an
 * alert is owner-only (enforced by RLS on alerts.resolved_by), so no
 * onResolve is ever passed here.
 */
export default async function PrincipalAlertsPage() {
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

  const open = enriched.filter((a) => a.status === "open");
  const resolved = enriched.filter((a) => a.status === "resolved");

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Alerts</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Compliance issues detected automatically across papers, tests, and results. Resolving an
        alert happens on the owner side.
      </p>

      <div className="mt-5">
        <Tabs
          tabs={[
            {
              id: "open",
              label: `Open (${open.length})`,
              content:
                open.length === 0 ? (
                  <EmptyState
                    title="No compliance issues right now"
                    description="Every paper, test, and result is on track."
                  />
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {open.map((alert) => (
                      <li key={alert.id}>
                        <AlertCard alert={alert} showTeacher />
                      </li>
                    ))}
                  </ul>
                )
            },
            {
              id: "resolved",
              label: `Resolved (${resolved.length})`,
              content:
                resolved.length === 0 ? (
                  <EmptyState
                    title="Nothing resolved yet"
                    description="Alerts resolved by the owner will be kept here as a history."
                  />
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {resolved.map((alert) => (
                      <li key={alert.id}>
                        <AlertCard alert={alert} showTeacher />
                      </li>
                    ))}
                  </ul>
                )
            }
          ]}
        />
      </div>
    </main>
  );
}
