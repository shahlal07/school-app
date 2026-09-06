import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createCalendarOverride, deleteCalendarOverride } from "./actions";
import { NextEligibleDayWidget } from "./next-eligible-day-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/get-translator";
import { Bdi } from "@/components/shared/bdi";

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

interface CalendarOverrideRow {
  id: string;
  date: string;
  day_status: "holiday" | "working_day";
  holiday_type: string | null;
  name: string;
  notes: string | null;
}

const HOLIDAY_TYPE_KEY: Record<(typeof HOLIDAY_TYPES)[number], string> = {
  public: "coordinator.calendar.holidayTypePublic",
  religious: "coordinator.calendar.holidayTypeReligious",
  school: "coordinator.calendar.holidayTypeSchool",
  weather: "coordinator.calendar.holidayTypeWeather",
  emergency: "coordinator.calendar.holidayTypeEmergency",
  teacher_training: "coordinator.calendar.holidayTypeTeacherTraining",
  local: "coordinator.calendar.holidayTypeLocal",
  custom: "coordinator.calendar.holidayTypeCustom"
};

export default async function CoordinatorCalendarPage() {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const canManage = profile.role === "academic_coordinator";
  const supabase = createClient();
  const t = await getT();
  const formatHolidayType = (type: string): string =>
    t(HOLIDAY_TYPE_KEY[type as (typeof HOLIDAY_TYPES)[number]] ?? type);

  const { data } = await supabase
    .from("calendar_overrides")
    .select("id,date,day_status,holiday_type,name,notes")
    .order("date", { ascending: true });

  const overrides = (data as CalendarOverrideRow[] | null) ?? [];

  const submitOverride = async (formData: FormData) => {
    "use server";
    await createCalendarOverride(formData);
  };

  return (
    <main className="flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("coordinator.calendar.title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("coordinator.calendar.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("coordinator.calendar.nextEligibleDay")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NextEligibleDayWidget />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t("coordinator.calendar.addOverride")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitOverride} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                {t("coordinator.calendar.date")}
                <input
                  name="date"
                  type="date"
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                />
              </label>
              <label className="text-sm">
                {t("coordinator.calendar.dayStatus")}
                <select
                  name="dayStatus"
                  required
                  defaultValue="holiday"
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                >
                  <option value="holiday">{t("coordinator.calendar.holiday")}</option>
                  <option value="working_day">{t("coordinator.calendar.workingDayOverride")}</option>
                </select>
              </label>
              <label className="text-sm">
                {t("coordinator.calendar.holidayType")}
                <select
                  name="holidayType"
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                >
                  <option value="">{t("coordinator.calendar.notApplicable")}</option>
                  {HOLIDAY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatHolidayType(type)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-neutral-500">
                  {t("coordinator.calendar.holidayTypeHelp")}
                </span>
              </label>
              <label className="text-sm">
                {t("coordinator.calendar.name")}
                <input
                  name="name"
                  required
                  placeholder={t("coordinator.calendar.namePlaceholder")}
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                {t("coordinator.calendar.notes")}
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                {t("coordinator.calendar.saveOverride")}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("coordinator.calendar.holidaysAndOverrides")}</CardTitle>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <EmptyState
              title={t("coordinator.calendar.noHolidaysTitle")}
              description={t("coordinator.calendar.noHolidaysDescription")}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {overrides.map((o) => (
                <div key={o.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900"><Bdi>{o.date}</Bdi></p>
                      <p className="text-xs text-neutral-500">
                        <Bdi>{o.name}</Bdi>
                        {o.day_status === "holiday" && o.holiday_type
                          ? <> · {formatHolidayType(o.holiday_type)}</>
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={o.day_status === "holiday" ? "warning" : "success"}>
                        {o.day_status === "holiday" ? t("coordinator.calendar.holiday") : t("coordinator.calendar.workingDay")}
                      </Badge>
                      {canManage && (
                        <form
                          action={async () => {
                            "use server";
                            await deleteCalendarOverride(o.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-200"
                          >
                            {t("coordinator.calendar.delete")}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  {o.notes && <p className="mt-2 text-sm text-neutral-700"><Bdi>{o.notes}</Bdi></p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
