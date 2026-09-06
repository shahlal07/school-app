import type { AlertRow, AlertWithTeacher } from "@/components/examination/alert-types";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/get-translator";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCard } from "@/components/examination/alert-card";

/**
 * Read-only compliance inbox scoped to the signed-in teacher. RLS on
 * `alerts` already restricts rows to `teacher_id = auth.uid()`, so a plain
 * unfiltered select is correct and complete here - same principle as
 * /teacher/exams. Teachers cannot resolve alerts (owner-only, enforced by
 * RLS too), so no action is wired up here.
 */
export default async function TeacherAlertsPage() {
  const t = await getT();
  const supabase = createClient();

  const { data } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  const alerts = (data as AlertRow[] | null) ?? [];
  const enriched: AlertWithTeacher[] = alerts.map((alert) => ({ ...alert, teacherName: null }));

  const open = enriched.filter((a) => a.status === "open");
  const resolved = enriched.filter((a) => a.status === "resolved");

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.alerts")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("teacher.alerts.subtitle")}
      </p>

      <div className="mt-5 flex flex-col gap-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t("teacher.alerts.openHeading")}
          </h2>
          {open.length === 0 ? (
            <EmptyState
              title={t("teacher.alerts.emptyTitle")}
              description={t("teacher.alerts.emptyDescription")}
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {open.map((alert) => (
                <li key={alert.id}>
                  <AlertCard alert={alert} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {resolved.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t("teacher.alerts.resolvedHeading")}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {resolved.map((alert) => (
                <li key={alert.id}>
                  <AlertCard alert={alert} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
