import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createCalendarOverride, deleteCalendarOverride } from "./actions";
import { NextEligibleDayWidget } from "./next-eligible-day-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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

function formatHolidayType(type: string): string {
  return type.replace(/_/g, " ");
}

export default async function CoordinatorCalendarPage() {
  const profile = await requireAnyRole(["owner", "academic_coordinator"]);
  const canManage = profile.role === "academic_coordinator";
  const supabase = createClient();

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
        <h1 className="text-xl font-semibold text-neutral-900">Academic calendar</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Holidays and working-day overrides that the continuous-exam-scheduling engine uses to
          decide which dates are eligible for exams, on top of the default weekend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next eligible exam day</CardTitle>
        </CardHeader>
        <CardContent>
          <NextEligibleDayWidget />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add holiday / working-day override</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitOverride} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Date
                <input
                  name="date"
                  type="date"
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                />
              </label>
              <label className="text-sm">
                Day status
                <select
                  name="dayStatus"
                  required
                  defaultValue="holiday"
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                >
                  <option value="holiday">Holiday</option>
                  <option value="working_day">Working day override</option>
                </select>
              </label>
              <label className="text-sm">
                Holiday type
                <select
                  name="holidayType"
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                >
                  <option value="">Not applicable (working day)</option>
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {formatHolidayType(t)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-neutral-500">
                  Required when day status is Holiday, must be left blank for a working day.
                </span>
              </label>
              <label className="text-sm">
                Name
                <input
                  name="name"
                  required
                  placeholder="e.g. Eid-ul-Fitr"
                  className="mt-1 w-full rounded-xl border border-neutral-200 p-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Notes
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
                Save override
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Holidays and overrides</CardTitle>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <EmptyState
              title="No holidays or overrides recorded yet."
              description="Overrides declare a date as a holiday, or turn a normally-off day into an exam-eligible working day."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {overrides.map((o) => (
                <div key={o.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{o.date}</p>
                      <p className="text-xs text-neutral-500">
                        {o.name}
                        {o.day_status === "holiday" && o.holiday_type
                          ? ` · ${formatHolidayType(o.holiday_type)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={o.day_status === "holiday" ? "warning" : "success"}>
                        {o.day_status === "holiday" ? "Holiday" : "Working day"}
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
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  {o.notes && <p className="mt-2 text-sm text-neutral-700">{o.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
