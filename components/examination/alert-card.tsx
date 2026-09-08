"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bdi } from "@/components/shared/bdi";
import { useTranslation } from "@/lib/i18n/locale-provider";
import {
  ALERT_SEVERITY_BADGE_VARIANT,
  ALERT_SEVERITY_LABEL,
  ALERT_TYPE_LABEL,
  type AlertWithTeacher
} from "@/components/examination/alert-types";

function formatRelativeOrDate(iso: string, t: (key: string) => string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t("alerts.unknownDate");
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return t("alerts.justNow");
  if (diffMinutes < 60) return `${diffMinutes}${t("alerts.minutesAgoSuffix")}`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}${t("alerts.hoursAgoSuffix")}`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}${t("alerts.daysAgoSuffix")}`;
  return date.toLocaleDateString(locale === "ur" ? "ur-PK" : "en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface AlertCardProps {
  alert: AlertWithTeacher;
  showTeacher?: boolean;
  onResolve?: (alertId: string) => Promise<void>;
}

export function AlertCard({ alert, showTeacher = false, onResolve }: AlertCardProps) {
  const { t, locale } = useTranslation();
  const [resolving, setResolving] = useState(false);
  const typeKey = ALERT_TYPE_LABEL[alert.type];
  const severityKey = ALERT_SEVERITY_LABEL[alert.severity];
  const typeLabel = typeKey ? t(typeKey) : t("alerts.types.unknown");
  const severityLabel = severityKey ? t(severityKey) : t("alerts.severity.unknown");
  const severityVariant = ALERT_SEVERITY_BADGE_VARIANT[alert.severity] ?? "neutral";

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve?.(alert.id);
    } finally {
      setResolving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-neutral-900">{typeLabel}</span>
            <Badge variant={severityVariant}>{severityLabel}</Badge>
          </div>
          <p className="break-words text-sm text-neutral-700"><Bdi>{alert.message || t("alerts.noMessage")}</Bdi></p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
            <span>{formatRelativeOrDate(alert.created_at, t, locale)}</span>
            {showTeacher && alert.teacherName && <><span aria-hidden="true">-</span><span className="truncate">{t("alerts.teacherLabel")} <Bdi>{alert.teacherName}</Bdi></span></>}
            {alert.status === "resolved" && alert.resolved_at && <><span aria-hidden="true">-</span><span>{t("alerts.resolvedPrefix")} {formatRelativeOrDate(alert.resolved_at, t, locale)}</span></>}
          </div>
        </div>
        {onResolve && alert.status === "open" && <div className="shrink-0"><Button variant="secondary" size="sm" loading={resolving} onClick={handleResolve}>{t("alerts.resolve")}</Button></div>}
      </CardContent>
    </Card>
  );
}
