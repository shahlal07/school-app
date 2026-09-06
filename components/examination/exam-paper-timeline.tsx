import { getT } from "@/lib/i18n/get-translator";
import { Badge } from "@/components/ui/badge";
import { Bdi } from "@/components/shared/bdi";

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

function jobLabel(t: (key: string) => string, status: string): string {
  return status === "queued" ? t("teacher.paperTimeline.queuedForPrinting") : status === "printed" ? t("status.printed") : status;
}

function versionStatusLabel(t: (key: string) => string, status: string): string {
  const key: Record<string, string> = {
    approved: "status.approved",
    rejected: "status.rejected",
    printed: "status.printed",
    submitted: "status.submitted"
  };
  return key[status] ? t(key[status]) : status;
}

export async function ExamPaperTimeline({
  status,
  submittedAt,
  reviewedAt,
  reviewNotes,
  currentVersion,
  versions,
  jobs,
  fileUrl
}: ExamPaperTimelineProps) {
  const t = await getT();
  const steps = [
    { label: t("status.submitted"), done: Boolean(submittedAt), date: formatDate(submittedAt) },
    { label: t("status.reviewed"), done: Boolean(reviewedAt), date: formatDate(reviewedAt) },
    {
      label: t("status.approved"),
      done: ["approved", "conducted", "results_pending", "completed"].includes(status),
      date: null
    },
    {
      label: t("status.printed"),
      done: jobs.some((job) => job.status === "printed"),
      date: formatDate(jobs.find((job) => job.status === "printed")?.printed_at ?? null)
    }
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">{t("teacher.paperTimeline.heading")}</h2>
            <p className="text-xs text-neutral-500">{t("teacher.paperTimeline.versionLabel")} <Bdi>{currentVersion}</Bdi> {t("teacher.paperTimeline.versionActiveSuffix")}</p>
          </div>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-neutral-50"
            >
              {t("teacher.paperTimeline.openPaper")}
            </a>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((step) => (
            <div key={step.label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-700">{step.label}</span>
                <Badge variant={step.done ? "success" : "neutral"}>{step.done ? t("teacher.paperTimeline.done") : t("teacher.paperTimeline.waiting")}</Badge>
              </div>
              {step.date && <p className="mt-1 text-[11px] text-neutral-500"><Bdi>{step.date}</Bdi></p>}
            </div>
          ))}
        </div>

        {reviewNotes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">{t("teacher.paperTimeline.latestReviewNote")}</p>
            <p className="mt-1 text-sm text-amber-800"><Bdi>{reviewNotes}</Bdi></p>
          </div>
        )}

        {versions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("teacher.paperTimeline.versionsHeading")}</h3>
            <div className="mt-2 flex flex-col gap-2">
              {versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-2.5">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{t("teacher.paperTimeline.versionLabel")} <Bdi>{version.version_number}</Bdi></p>
                    <p className="text-[11px] text-neutral-500"><Bdi>{formatDate(version.created_at) ?? ""}</Bdi></p>
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
                    {versionStatusLabel(t, version.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("teacher.paperTimeline.printRecordsHeading")}</h3>
            <div className="mt-2 flex flex-col gap-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-neutral-100 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={job.status === "printed" ? "success" : "warning"}>{jobLabel(t, job.status)}</Badge>
                    <span className="text-xs text-neutral-500">
                      <Bdi>{job.copies}</Bdi> {t("teacher.paperTimeline.copiesLabel")} · {job.color_mode === "color" ? t("teacher.paperTimeline.colorLabel") : t("teacher.paperTimeline.bwLabel")} · {job.duplex ? t("teacher.paperTimeline.duplexLabel") : t("teacher.paperTimeline.singleSidedLabel")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {t("teacher.paperTimeline.queuedOn")} <Bdi>{formatDate(job.queued_at) ?? ""}</Bdi>{job.printed_at ? <> · {t("status.printed")} <Bdi>{formatDate(job.printed_at)}</Bdi></> : ""}
                  </p>
                  {job.reprint_reason && <p className="mt-1 text-xs text-neutral-600">{t("teacher.paperTimeline.reprintLabel")} <Bdi>{job.reprint_reason}</Bdi></p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
