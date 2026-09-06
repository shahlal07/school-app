import type { Class, Subject } from "@/types/examination";
import { createClient } from "@/lib/supabase/server";
import { classOrderIndex } from "@/components/examination/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ExistingScheduleList, type ScheduleItemRow } from "@/components/examination/schedule-list";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

/**
 * Read-only exam schedule view for principal. Unlike app/owner/schedule,
 * this intentionally does NOT reuse <ScheduleGenerator> - schedule
 * generation/save is a write action gated by can_manage_academics(), which
 * principal does not have, so there is no generator UI to show at all (not
 * just a hidden one). Only the already-read-only <ExistingScheduleList />
 * building block is reused, grouped by class and subject.
 */
export default async function PrincipalSchedulePage() {
  const supabase = createClient();
  const t = await getT();

  const [classesRes, subjectsRes, scheduleItemsRes] = await Promise.all([
    supabase.from("classes").select("*"),
    supabase.from("subjects").select("*").order("name", { ascending: true }),
    supabase.from("schedule_items").select("*").order("scheduled_date", { ascending: true })
  ]);

  const classes = ((classesRes.data as Class[] | null) ?? [])
    .slice()
    .sort((a, b) => classOrderIndex(a.name) - classOrderIndex(b.name));
  const subjects = (subjectsRes.data as Subject[] | null) ?? [];
  const scheduleItems = (scheduleItemsRes.data as ScheduleItemRow[] | null) ?? [];

  const subjectsByClass: Record<string, Subject[]> = {};
  for (const subject of subjects) {
    (subjectsByClass[subject.class_id] ??= []).push(subject);
  }

  const scheduleItemsBySubject: Record<string, ScheduleItemRow[]> = {};
  for (const item of scheduleItems) {
    (scheduleItemsBySubject[item.subject_id] ??= []).push(item);
  }

  const classesWithSchedules = classes.filter((klass) =>
    (subjectsByClass[klass.id] ?? []).some(
      (subject) => (scheduleItemsBySubject[subject.id] ?? []).length > 0
    )
  );

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">{t("nav.schedule")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("principal.schedule.subtitle")}
      </p>

      <div className="mt-5">
        {classesWithSchedules.length === 0 ? (
          <EmptyState
            title={t("emptyStates.nothingScheduledYet")}
            description={t("principal.schedule.emptyDescription")}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {classesWithSchedules.map((klass) => {
              const classSubjects = (subjectsByClass[klass.id] ?? []).filter(
                (subject) => (scheduleItemsBySubject[subject.id] ?? []).length > 0
              );
              return (
                <Card key={klass.id}>
                  <CardHeader>
                    <CardTitle>
                      <Bdi>{klass.name}</Bdi>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {classSubjects.map((subject) => (
                      <div key={subject.id}>
                        <p className="mb-1 text-sm font-medium text-neutral-700">
                          <Bdi>{subject.name}</Bdi>
                        </p>
                        <ExistingScheduleList items={scheduleItemsBySubject[subject.id] ?? []} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
