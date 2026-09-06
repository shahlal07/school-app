"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { AlertCard } from "@/components/examination/alert-card";
import type { AlertWithTeacher } from "@/components/examination/alert-types";

interface AlertInboxProps {
  open: AlertWithTeacher[];
  resolved: AlertWithTeacher[];
  onResolve: (alertId: string) => Promise<{ error: string | null }>;
}

function AlertList({
  alerts,
  emptyTitle,
  emptyDescription,
  onResolve
}: {
  alerts: AlertWithTeacher[];
  emptyTitle: string;
  emptyDescription: string;
  onResolve?: (alertId: string) => Promise<void>;
}) {
  if (alerts.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {alerts.map((alert) => (
        <li key={alert.id}>
          <AlertCard alert={alert} showTeacher onResolve={onResolve} />
        </li>
      ))}
    </ul>
  );
}

function AlertInboxInner({ open, resolved, onResolve }: AlertInboxProps) {
  const { toast } = useToast();

  const handleResolve = async (alertId: string) => {
    const result = await onResolve(alertId);
    if (result.error) {
      toast(result.error, "danger");
    } else {
      toast("Alert resolved.", "success");
    }
  };

  return (
    <Tabs
      tabs={[
        {
          id: "open",
          label: `Open (${open.length})`,
          content: (
            <AlertList
              alerts={open}
              emptyTitle="No compliance issues right now"
              emptyDescription="Every paper, test, and result is on track. New alerts will show up here automatically as the hourly compliance scan finds something that needs your attention."
              onResolve={handleResolve}
            />
          )
        },
        {
          id: "resolved",
          label: `Resolved (${resolved.length})`,
          content: (
            <AlertList
              alerts={resolved}
              emptyTitle="Nothing resolved yet"
              emptyDescription="Alerts you resolve will be kept here as a history."
            />
          )
        }
      ]}
    />
  );
}

export function AlertInbox(props: AlertInboxProps) {
  return (
    <ToastProvider>
      <AlertInboxInner {...props} />
    </ToastProvider>
  );
}
