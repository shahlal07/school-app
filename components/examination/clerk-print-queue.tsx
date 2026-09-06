"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { getClerkPaperUrl, markExamPaperPrinted, queueExamPaper } from "@/app/clerk/papers/actions";

function QueueInner({ rows }: { rows: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function open(path: string) {
    setBusy(path); const result = await getClerkPaperUrl(path); setBusy(null);
    if (result.error) return toast(result.error, "danger");
    window.open(result.url!, "_blank", "noopener,noreferrer");
  }
  async function queue(id: string) {
    setBusy(id); const result = await queueExamPaper(id); setBusy(null);
    if (result.error) return toast(result.error, "danger"); toast("Placed in print queue", "success"); router.refresh();
  }
  async function printed(id: string) {
    setBusy(id); const result = await markExamPaperPrinted(id); setBusy(null);
    if (result.error) return toast(result.error, "danger"); toast("Marked printed. Teacher and coordinator notified.", "success"); router.refresh();
  }
  if (!rows.length) return <EmptyState title="No exam papers yet" description="Submitted teacher papers will appear here automatically." />;
  return <div className="flex flex-col gap-3">{rows.map((r) => <Card key={r.paper.id}><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-neutral-900">{r.schedule.title}</p><p className="text-xs text-neutral-500">{r.className} · {r.subjectName} · {r.teacherName}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="info">Paper {r.paper.status}</Badge>{r.job && <Badge variant={r.job.status === "printed" ? "success" : "warning"}>{r.job.status}</Badge>}</div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => open(r.paper.file_path)} loading={busy === r.paper.file_path}>Open</Button>{!r.job && <Button size="sm" onClick={() => queue(r.paper.id)} loading={busy === r.paper.id}>Place for printing</Button>}{r.job?.status === "queued" && <Button size="sm" onClick={() => printed(r.job.id)} loading={busy === r.job.id}>Mark printed</Button>}</div></CardContent></Card>)}</div>;
}
export function ClerkPrintQueue(props: { rows: any[] }) { return <ToastProvider><QueueInner {...props} /></ToastProvider>; }
