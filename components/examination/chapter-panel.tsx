"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Chapter, Topic } from "@/types/examination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { NameDescriptionDialog } from "@/components/examination/name-description-dialog";
import { ConfirmDialog } from "@/components/examination/confirm-dialog";
import { TopicPanel } from "@/components/examination/topic-panel";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapter
} from "@/app/owner/syllabus/actions";

interface ChapterPanelProps {
  subjectId: string;
  chapters: Chapter[];
  topicsByChapter: Record<string, Topic[]>;
  /** Hides add/edit/delete/reorder controls (here and in the nested
   * TopicPanel) - used on the principal's read-only syllabus view. */
  readOnly?: boolean;
}

export function ChapterPanel({
  subjectId,
  chapters,
  topicsByChapter,
  readOnly = false
}: ChapterPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);
  const [pendingReorderId, setPendingReorderId] = useState<string | null>(null);

  const sorted = [...chapters].sort((a, b) => a.order_index - b.order_index);

  const handleReorder = async (chapterId: string, direction: "up" | "down") => {
    setPendingReorderId(chapterId);
    const result = await reorderChapter(chapterId, direction);
    setPendingReorderId(null);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deletingChapter) return;
    const result = await deleteChapter(deletingChapter.id);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    toast("Chapter deleted", "success");
    setDeletingChapter(null);
    if (expandedChapterId === deletingChapter.id) setExpandedChapterId(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
      {sorted.length === 0 ? (
        <EmptyState
          title="No chapters yet"
          description="This subject has no chapters. Add the first one to start building its syllabus."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((chapter, index) => {
            const isExpanded = expandedChapterId === chapter.id;
            const topicCount = (topicsByChapter[chapter.id] ?? []).length;
            return (
              <li key={chapter.id} className="rounded-xl border border-neutral-200">
                <div className="flex items-start justify-between gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                  >
                    <span className="truncate text-sm font-semibold text-neutral-900">
                      {chapter.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {topicCount} {topicCount === 1 ? "topic" : "topics"}
                    </span>
                  </button>
                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Move chapter up"
                        disabled={index === 0 || pendingReorderId === chapter.id}
                        onClick={() => handleReorder(chapter.id, "up")}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                      >
                        <ArrowUpIcon />
                      </button>
                      <button
                        type="button"
                        aria-label="Move chapter down"
                        disabled={index === sorted.length - 1 || pendingReorderId === chapter.id}
                        onClick={() => handleReorder(chapter.id, "down")}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                      >
                        <ArrowDownIcon />
                      </button>
                      <button
                        type="button"
                        aria-label="Edit chapter"
                        onClick={() => setEditingChapter(chapter)}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete chapter"
                        onClick={() => setDeletingChapter(chapter)}
                        className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3">
                    {chapter.description && (
                      <p className="mb-2 text-xs text-neutral-500">{chapter.description}</p>
                    )}
                    <TopicPanel
                      chapterId={chapter.id}
                      topics={topicsByChapter[chapter.id] ?? []}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <>
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setAddOpen(true)}>
            + Add chapter
          </Button>

          <NameDescriptionDialog
            open={addOpen}
            title="Add chapter"
            nameLabel="Chapter name"
            onClose={() => setAddOpen(false)}
            onSubmit={async ({ name, description }) => {
              const result = await createChapter(subjectId, { name, description });
              if (result.error) return result.error;
              toast("Chapter added", "success");
              router.refresh();
              return null;
            }}
          />

          <NameDescriptionDialog
            open={!!editingChapter}
            title="Edit chapter"
            nameLabel="Chapter name"
            initialName={editingChapter?.name ?? ""}
            initialDescription={editingChapter?.description ?? ""}
            onClose={() => setEditingChapter(null)}
            onSubmit={async ({ name, description }) => {
              if (!editingChapter) return null;
              const result = await updateChapter(editingChapter.id, { name, description });
              if (result.error) return result.error;
              toast("Chapter updated", "success");
              router.refresh();
              return null;
            }}
          />

          <ConfirmDialog
            open={!!deletingChapter}
            title="Delete chapter?"
            description={`"${deletingChapter?.name ?? ""}" and all of its topics will be permanently removed.`}
            confirmLabel="Delete"
            destructive
            onClose={() => setDeletingChapter(null)}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 4v8M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 2.5a1.5 1.5 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 4h11M6 4V2.5h4V4M4.5 4l.5 9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
