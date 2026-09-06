import { Badge } from "@/components/ui/badge";

interface VersionRow {
  id: string;
  version_number: number;
  created_at: string;
  status: string;
}

interface PrintJobRow {
  id: string;
  status: string;
  queued_at: string;
  printed_at: string | null;
  copies: number;
  color_mode: string;
  duplex: boolean;
  priority: string;
  reprint_reason: string | null;
}

interface ExamPaperTimelineProps {
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  currentVersion: number;
  versions: VersionRow[];
  jobs: PrintJobRow[];
  fileUrl: string | null;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi"
  });
}

function jobLabel(status: string): string {
  return status === "queued" ? "Queued for printing" : status === "printed" ? "Printed" : status;
}

export function ExamPaperTimeline({
  status,
  submittedAt,
  reviewedAt,
  reviewNotes,
  currentVersion,
  versions,
  jobs,
  fileUrl
}: ExamPaperTimelineProps) {
  const steps = [
    { label: "Submitted", done: Boolean(submittedAt), date: formatDate(submittedAt) },
    { label: "Reviewed", done: Boolean(reviewedAt), date: formatDate(reviewedAt) },
    {
      label: "Approved",
      done: ["approved", "conducted", "results_pending", "completed"].includes(status),
      date: null
    },
    {
      label: "Printed",
      done: jobs.some((job) => job.status === "printed"),
      date: formatDate(jobs.find((job) => job.status === "printed")?.printed_at ?? null)
    }
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Paper history</h2>
            <p className="text-xs text-neutral-500">Version {currentVersion} is the active submission.</p>
          </div>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-neutral-50"
            >
              Open paper
            </a>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((step) => (
            <div key={step.label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-700">{step.label}</span>
                <Badge variant={step.done ? "success" : "neutral"}>{step.done ? "Done" : "Waiting"}</Badge>
              </div>
              {step.date && <p className="mt-1 text-[11px] text-neutral-500">{step.date}</p>}
            </div>
          ))}
        </div>

        {reviewNotes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">Latest review note</p>
            <p className="mt-1 text-sm text-amber-800">{reviewNotes}</p>
          </div>
        )}

        {versions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Versions</h3>
            <div className="mt-2 flex flex-col gap-2">
              {versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-2.5">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">Version {version.version_number}</p>
                    <p className="text-[11px] text-neutral-500">{formatDate(version.created_at) ?? ""}</p>
                  </div>
                  <Badge
                    variant={
                      version.status === "approved" || version.status === "printed"
                        ? "success"
                        : version.status === "rejected"
                          ? "danger"
                          : "info"
                    }
                  >
                    {version.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Print records</h3>
            <div className="mt-2 flex flex-col gap-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-neutral-100 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={job.status === "printed" ? "success" : "warning"}>{jobLabel(job.status)}</Badge>
                    <span className="text-xs text-neutral-500">
                      {job.copies} copies · {job.color_mode === "color" ? "Color" : "B&W"} · {job.duplex ? "Duplex" : "Single-sided"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Queued {formatDate(job.queued_at) ?? ""}{job.printed_at ? ` · Printed ${formatDate(job.printed_at)}` : ""}
                  </p>
                  {job.reprint_reason && <p className="mt-1 text-xs text-neutral-600">Reprint: {job.reprint_reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
