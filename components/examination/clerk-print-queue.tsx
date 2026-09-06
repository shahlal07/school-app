"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast, ToastProvider } from "@/components/ui/toast";
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

function QueueInner({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [options, setOptions] = useState<Record<string, PrintOptions>>({});

  const getOptions = (id: string): PrintOptions => options[id] ?? { copies: 1, colorMode: "bw", duplex: true, pageCount: null, priority: "normal" };
  const updateOptions = (id: string, patch: Partial<PrintOptions>) => setOptions((current) => ({ ...current, [id]: { ...getOptions(id), ...patch } }));

  async function open(path: string | null) {
    if (!path) return toast("Paper file is missing.", "danger");
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
    toast("Placed in print queue", "success");
    router.refresh();
  }
  async function printed(id: string) {
    setBusy(id);
    const result = await markExamPaperPrinted(id);
    setBusy(null);
    if (result.error) return toast(result.error, "danger");
    toast("Marked printed. Teacher and coordinator notified.", "success");
    router.refresh();
  }
  async function reprint(job: PrintJob) {
    const reason = window.prompt("Why is this paper being reprinted?");
    if (!reason?.trim()) return;
    const requested = window.prompt("How many copies?", String(job.copies));
    const copies = Number(requested ?? job.copies);
    if (!Number.isInteger(copies) || copies < 1) return toast("Enter a valid copy count.", "danger");
    setBusy(job.id);
    const result = await createExamPaperReprint(job.id, copies, reason);
    setBusy(null);
    if (result.error) return toast(result.error, "danger");
    toast("Reprint queued with audit reason", "success");
    router.refresh();
  }

  if (!rows.length) return <EmptyState title="No exam papers yet" description="Submitted teacher papers will appear here automatically." />;

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
                  <p className="font-semibold text-neutral-900">{r.schedule.title}</p>
                  <p className="text-xs text-neutral-500">{r.className} · {r.subjectName} · {r.teacherName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={approved ? "success" : "warning"}>Paper {r.paper.status}</Badge>
                    {r.job && <Badge variant={r.job.status === "printed" ? "success" : "warning"}>{r.job.status}</Badge>}
                    {!approved && !r.job && <span className="text-xs text-neutral-500">Waiting for coordinator approval</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => open(r.paper.file_path)} loading={busy === r.paper.file_path}>Open</Button>
              </div>

              {approved && !r.job && (
                <div className="grid gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-5">
                  <label className="text-xs font-medium text-neutral-600">Copies<input className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" type="number" min={1} max={10000} value={config.copies} onChange={(e) => updateOptions(r.paper.id, { copies: Number(e.target.value) })} /></label>
                  <label className="text-xs font-medium text-neutral-600">Color<select className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={config.colorMode} onChange={(e) => updateOptions(r.paper.id, { colorMode: e.target.value as "bw" | "color" })}><option value="bw">B&W</option><option value="color">Color</option></select></label>
                  <label className="text-xs font-medium text-neutral-600">Sides<select className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={config.duplex ? "duplex" : "single"} onChange={(e) => updateOptions(r.paper.id, { duplex: e.target.value === "duplex" })}><option value="duplex">Double-sided</option><option value="single">Single-sided</option></select></label>
                  <label className="text-xs font-medium text-neutral-600">Pages<input className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" type="number" min={1} max={10000} placeholder="Optional" value={config.pageCount ?? ""} onChange={(e) => updateOptions(r.paper.id, { pageCount: e.target.value ? Number(e.target.value) : null })} /></label>
                  <label className="text-xs font-medium text-neutral-600">Priority<select className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm" value={config.priority} onChange={(e) => updateOptions(r.paper.id, { priority: e.target.value as PrintOptions["priority"] })}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {approved && !r.job && <Button size="sm" onClick={() => queue(r.paper.id)} loading={busy === r.paper.id}>Place for printing</Button>}
                {r.job?.status === "queued" && <Button size="sm" onClick={() => printed(r.job!.id)} loading={busy === r.job!.id}>Mark printed</Button>}
                {r.job?.status === "printed" && <Button size="sm" variant="secondary" onClick={() => reprint(r.job!)} loading={busy === r.job!.id}>Queue reprint</Button>}
              </div>

              {r.job && <p className="text-xs text-neutral-500">{r.job.copies} copies · {r.job.color_mode === "color" ? "Color" : "B&W"} · {r.job.duplex ? "Double-sided" : "Single-sided"}{r.job.page_count ? ` · ${r.job.page_count} pages` : ""} · {r.job.priority} priority</p>}
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
