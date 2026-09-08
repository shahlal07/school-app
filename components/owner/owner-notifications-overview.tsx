import { Badge } from "@/components/ui/badge";
import { AlertInbox } from "@/components/examination/alert-inbox";
import type { AlertWithTeacher } from "@/components/examination/alert-types";

interface OwnerNotificationsOverviewProps {
  open: AlertWithTeacher[];
  resolved: AlertWithTeacher[];
  onResolve: (alertId: string) => Promise<{ error: string | null }>;
}

export function OwnerNotificationsOverview({
  open,
  resolved,
  onResolve
}: OwnerNotificationsOverviewProps) {
  const priority = open.filter((alert) => alert.severity === "critical" || alert.severity === "urgent");
  const warnings = open.filter((alert) => alert.severity === "warning");
  const info = open.filter((alert) => alert.severity === "info");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = [...open, ...resolved].filter((alert) => new Date(alert.created_at) >= todayStart).length;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6 lg:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Owner · Notifications</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Notifications command center</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">School-wide alerts and signals that require leadership awareness. Resolve an issue here after the underlying academic or attendance problem has been addressed.</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 shadow-sm">
          <span className="font-semibold text-neutral-900">Live compliance feed</span>
          <span className="mx-1.5">·</span>
          Hourly scan
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Needs attention" value={open.length} detail="Open notifications" tone={open.length ? "danger" : "success"} />
        <Metric label="Priority" value={priority.length} detail="Urgent or critical" tone={priority.length ? "danger" : "neutral"} />
        <Metric label="Warnings" value={warnings.length} detail="Open warnings" tone={warnings.length ? "warning" : "neutral"} />
        <Metric label="Today" value={todayCount} detail="Notifications raised today" tone="neutral" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-neutral-950">Priority queue</h2>
              <p className="mt-1 text-sm text-neutral-500">The highest-severity signals should be reviewed first.</p>
            </div>
            <Badge variant={priority.length ? "danger" : "success"}>{priority.length ? `${priority.length} open` : "Clear"}</Badge>
          </div>
          {priority.length ? (
            <div className="mt-4 space-y-2">
              {priority.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm font-bold text-red-700">!</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{alert.message}</p>
                      {alert.teacherName ? <p className="mt-1 text-xs text-neutral-500">Teacher · {alert.teacherName}</p> : null}
                    </div>
                    <Badge variant={alert.severity === "critical" ? "danger" : "warning"}>{alert.severity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">No urgent or critical notifications are open.</div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-neutral-950">Notification mix</h2>
          <p className="mt-1 text-sm text-neutral-500">Open signals by severity.</p>
          <div className="mt-5 space-y-3">
            <Mix label="Priority" count={priority.length} total={open.length} variant="danger" />
            <Mix label="Warning" count={warnings.length} total={open.length} variant="warning" />
            <Mix label="Informational" count={info.length} total={open.length} variant="info" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-neutral-950">All notifications</h2>
            <p className="text-sm text-neutral-500">Open issues first, with resolved history kept below.</p>
          </div>
          <p className="text-xs text-neutral-400">{open.length} open · {resolved.length} resolved</p>
        </div>
        <AlertInbox open={open} resolved={resolved} onResolve={onResolve} />
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: number;
  detail: string;
  tone: "danger" | "warning" | "success" | "neutral";
}) {
  const badgeVariant = tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "neutral";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <Badge variant={badgeVariant}>{tone === "success" ? "Clear" : "Live"}</Badge>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function Mix({
  label,
  count,
  total,
  variant
}: {
  label: string;
  count: number;
  total: number;
  variant: "danger" | "warning" | "info";
}) {
  const width = total ? Math.round((count / total) * 100) : 0;
  const bar = variant === "danger" ? "bg-danger-500" : variant === "warning" ? "bg-warning-500" : "bg-primary-500";
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-700">{label}</span>
        <span className="font-semibold text-neutral-950">{count}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
