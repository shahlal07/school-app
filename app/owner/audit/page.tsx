import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AuditLog, Profile } from "@/types/database";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function actionLabel(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function AuditLogPage() {
  const supabase = createClient();

  const [logsRes, profilesRes] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("*")
  ]);

  const logs = (logsRes.data as AuditLog[] | null) ?? [];
  const profiles = (profilesRes.data as Profile[] | null) ?? [];
  const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return (
    <main className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Audit log</h1>
      <p className="mt-1 text-sm text-neutral-500">
        A record of sensitive actions taken across the school - who did what, and when.
      </p>

      <div className="mt-5">
        {logs.length === 0 ? (
          <EmptyState
            title="No audit entries yet"
            description="Sensitive actions (creating accounts, approving papers, resolving alerts, changing settings) will show up here as they happen."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => {
              const actor = log.actor_id ? profileByUserId.get(log.actor_id) : null;
              return (
                <li
                  key={log.id}
                  className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {actionLabel(log.action)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {actor?.full_name ?? "Unknown"} · {log.entity_type}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="neutral">{formatTimestamp(log.created_at)}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
