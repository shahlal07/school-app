"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { Bdi } from "@/components/shared/bdi";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { createExamPaperReprint, getClerkPaperUrl, markExamPaperPrinted, queueExamPaper, type PrintOptions } from "@/app/clerk/papers/actions";

interface PrintJob {
  id: string;
  status: string;
  copies: number;
  color_mode: "bw" | "color";
  duplex: boolean;
  page_count: number | null;
  priority: "low" | "normal" | "high" | "urgent";
}
interface QueueRow {
  paper: { id: string; status: string; file_path: string | null; current_version?: number };
  schedule: { title: string };
  className: string;
  subjectName: string;
  teacherName: string;
  job: PrintJob | null;
}

/** exam_papers.status values map 1:1 onto core status.* keys (snake_case -> camelCase). */
function paperStatusKey(status: string): string {
  const camel = status.replace(/_([a-z])/g, (_match, ch: string) => ch.toUpperCase());
  return `status.${camel}`;
}

function QueueInner({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, PrintOptions>>({});

  const getOptions = (id: string): PrintOptions => options[id] ?? { copies: 1, colorMode: "bw", duplex: true, pageCount: null, priority: "normal" };
  const updateOptions = (id: string, patch: Partial<PrintOptions>) => setOptions((current) => ({ ...current, [id]: { ...getOptions(id), ...patch } }));

  const priorityLabel = (priority: PrintOptions["priority"]): string => {
    switch (priority) {
      case "low": return t("clerk.papers.priorityLow");
      case "high": return t("clerk.papers.priorityHigh");
      case "urgent": return t("clerk.papers.priorityUrgent");
      default: return t("clerk.papers.priorityNormal");
    }
  };

  async function open(path: string | null) {
    if (!path) return toast(t("clerk.papers.paperFileMissing"), "danger");
    setBusy(path);
    const result = await getClerkPaperUrl(path);
    setBusy(null);
    if (result.error) return toast(result.error, "danger");
    window.open(result.url!, "_blank", "noopener,noreferrer");
  }
  async function queue(id: string) {
    setBusy(id);
    const result = await queueExamPaper(id, getOptions(id));
    setBusy(null);
    if (result.error) return toast(result.error, "danger");
    toast(t("clerk.papers.placedInQueue"), "success");
    router.refresh();
  }
  async function printed(id: string) {
    setBusy(id);
    const result = await markExamPaperPrinted(id);
    setBusy(null);
    if (result.error) return toast(result.error, "danger");
    toast(t("clerk.papers.markedPrinted"), "success");
    router.refresh();
  }
  async function reprint(job: PrintJob) {
    const reason = window.prompt(t("clerk.papers.reprintReasonPrompt"));
    if (!reason?.trim()) return;
    const requested = window.prompt(t("clerk.papers.reprintCopiesPrompt"), String(job.copies));
    const copies = Number(requested ?? job.copies);
    if (!Number.isInteger(copies) || copies < 1) return toast(t("clerk.papers.invalidCopyCount"), "danger");
    setBusy(job.id);
    const result = await createExamPaperReprint(job.id, copies, reason);
    setBusy(null);
    if (result.error) return toast(result.error, "danger");
    toast(t("clerk.papers.reprintQueued"), "success");
    router.refresh();
  }

  if (!rows.length) return <EmptyState title={t("clerk.papers.noPapersTitle")} description={t("clerk.papers.noPapersDescription")} />;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const approved = r.paper.status === "approved";
        const config = getOptions(r.paper.id);
        return (
          <Card key={r.paper.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900">
                    <Bdi>{r.schedule.title}</Bdi>
                  </p>
                  <p className="text-xs text-neutral-500">
                    <Bdi>{r.className}</Bdi> · <Bdi>{r.subjectName}</Bdi> · <Bdi>{r.teacherName}</Bdi>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={approved ? "success" : "warning"}>
                      {t("clerk.papers.paperPrefix")} {t(paperStatusKey(r.paper.status))}
                    </Badge>
                    {r.job && (
                      <Badge variant={r.job.status === "printed" ? "success" : "warning"}>
                        {r.job.status === "printed" ? t("status.printed") : t("clerk.papers.statusQueued")}
                      </Badge>
                    )}
                    {!approved && !r.job && (
                      <span className="text-xs text-neutral-500">{t("clerk.papers.waitingForApproval")}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => open(r.paper.file_path)} loading={busy === r.paper.file_path}>{t("common.open")}</Button>
              </div>

              {approved && !r.job && (
                <div className="grid gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-5">
                  <label className="text-xs font-medium text-neutral-600">{t("clerk.papers.copiesLabel")}<input className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" type="number" min={1} max={10000} value={config.copies} onChange={(e) => updateOptions(r.paper.id, { copies: Number(e.target.value) })} /></label>
                  <label className="text-xs font-medium text-neutral-600">{t("clerk.papers.colorLabel")}<select className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={config.colorMode} onChange={(e) => updateOptions(r.paper.id, { colorMode: e.target.value as "bw" | "color" })}><option value="bw">{t("clerk.papers.colorBw")}</option><option value="color">{t("clerk.papers.colorColor")}</option></select></label>
                  <label className="text-xs font-medium text-neutral-600">{t("clerk.papers.sidesLabel")}<select className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={config.duplex ? "duplex" : "single"} onChange={(e) => updateOptions(r.paper.id, { duplex: e.target.value === "duplex" })}><option value="duplex">{t("clerk.papers.sidesDouble")}</option><option value="single">{t("clerk.papers.sidesSingle")}</option></select></label>
                  <label className="text-xs font-medium text-neutral-600">{t("clerk.papers.pagesLabel")}<input className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" type="number" min={1} max={10000} placeholder={t("clerk.papers.pagesPlaceholder")} value={config.pageCount ?? ""} onChange={(e) => updateOptions(r.paper.id, { pageCount: e.target.value ? Number(e.target.value) : null })} /></label>
                  <label className="text-xs font-medium text-neutral-600">{t("clerk.papers.priorityLabel")}<select className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={config.priority} onChange={(e) => updateOptions(r.paper.id, { priority: e.target.value as PrintOptions["priority"] })}><option value="normal">{t("clerk.papers.priorityNormal")}</option><option value="high">{t("clerk.papers.priorityHigh")}</option><option value="urgent">{t("clerk.papers.priorityUrgent")}</option><option value="low">{t("clerk.papers.priorityLow")}</option></select></label>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {approved && !r.job && <Button size="sm" onClick={() => queue(r.paper.id)} loading={busy === r.paper.id}>{t("clerk.papers.placeForPrinting")}</Button>}
                {r.job?.status === "queued" && <Button size="sm" onClick={() => printed(r.job!.id)} loading={busy === r.job!.id}>{t("clerk.papers.markPrinted")}</Button>}
                {r.job?.status === "printed" && <Button size="sm" variant="secondary" onClick={() => reprint(r.job!)} loading={busy === r.job!.id}>{t("clerk.papers.queueReprint")}</Button>}
              </div>

              {r.job && (
                <p className="text-xs text-neutral-500">
                  <Bdi>{r.job.copies}</Bdi> {t("clerk.papers.copiesUnit")} ·{" "}
                  {r.job.color_mode === "color" ? t("clerk.papers.colorColor") : t("clerk.papers.colorBw")} ·{" "}
                  {r.job.duplex ? t("clerk.papers.sidesDouble") : t("clerk.papers.sidesSingle")}
                  {r.job.page_count ? (
                    <>
                      {" "}
                      · <Bdi>{r.job.page_count}</Bdi> {t("clerk.papers.pagesUnit")}
                    </>
                  ) : null}{" "}
                  · {priorityLabel(r.job.priority)} {t("clerk.papers.prioritySuffix")}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ClerkPrintQueue(props: { rows: QueueRow[] }) {
  return <ToastProvider><QueueInner {...props} /></ToastProvider>;
}
