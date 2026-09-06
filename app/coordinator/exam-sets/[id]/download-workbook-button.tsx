"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/locale-provider";

/**
 * Downloads the printable Excel workbook for this completed exam set
 * (Phase E). A plain server action can't stream a binary response cleanly,
 * so this hits the API route (app/api/exam-sets/[id]/workbook/route.ts)
 * directly and saves the blob it returns - the route re-checks auth/
 * completion itself, this button is UX only.
 */
export function DownloadWorkbookButton({ examSetId }: { examSetId: string }) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam-sets/${examSetId}/workbook`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t("coordinator.examSetReport.workbookError"));
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? "exam-set-report.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("coordinator.examSetReport.workbookError"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" onClick={handleDownload} loading={downloading}>
        {t("coordinator.examSetReport.downloadWorkbook")}
      </Button>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}
