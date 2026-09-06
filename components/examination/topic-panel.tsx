"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Topic } from "@/types/examination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { NameDescriptionDialog } from "@/components/examination/name-description-dialog";
import { ConfirmDialog } from "@/components/examination/confirm-dialog";
import { createTopic, updateTopic, deleteTopic, reorderTopic } from "@/app/owner/syllabus/actions";

interface TopicPanelProps {
  chapterId: string;
  topics: Topic[];
  /** Hides add/edit/delete/reorder controls - used on the principal's
   * read-only syllabus view, since principal has view-only academic RLS. */
  readOnly?: boolean;
}

export function TopicPanel({ chapterId, topics, readOnly = false }: TopicPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [pendingReorderId, setPendingReorderId] = useState<string | null>(null);

  const sorted = [...topics].sort((a, b) => a.order_index - b.order_index);

  const handleReorder = async (topicId: string, direction: "up" | "down") => {
    setPendingReorderId(topicId);
    const result = await reorderTopic(topicId, direction);
    setPendingReorderId(null);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deletingTopic) return;
    const result = await deleteTopic(deletingTopic.id);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    toast("Topic deleted", "success");
    setDeletingTopic(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2 border-l-2 border-neutral-100 pl-3">
      {sorted.length === 0 ? (
        <EmptyState title="No topics yet" description="Add the first topic for this chapter." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((topic, index) => (
            <li
              key={topic.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">{topic.name}</p>
                {topic.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                    {topic.description}
                  </p>
                )}
              </div>
              {!readOnly && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Move topic up"
                    disabled={index === 0 || pendingReorderId === topic.id}
                    onClick={() => handleReorder(topic.id, "up")}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30"
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="Move topic down"
                    disabled={index === sorted.length - 1 || pendingReorderId === topic.id}
                    onClick={() => handleReorder(topic.id, "down")}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30"
                  >
                    <ArrowDownIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="Edit topic"
                    onClick={() => setEditingTopic(topic)}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete topic"
                    onClick={() => setDeletingTopic(topic)}
                    className="rounded-lg p-1.5 text-danger-600 hover:bg-danger-50"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <>
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setAddOpen(true)}>
            + Add topic
          </Button>

          <NameDescriptionDialog
            open={addOpen}
            title="Add topic"
            nameLabel="Topic name"
            onClose={() => setAddOpen(false)}
            onSubmit={async ({ name, description }) => {
              const result = await createTopic(chapterId, { name, description });
              if (result.error) return result.error;
              toast("Topic added", "success");
              router.refresh();
              return null;
            }}
          />

          <NameDescriptionDialog
            open={!!editingTopic}
            title="Edit topic"
            nameLabel="Topic name"
            initialName={editingTopic?.name ?? ""}
            initialDescription={editingTopic?.description ?? ""}
            onClose={() => setEditingTopic(null)}
            onSubmit={async ({ name, description }) => {
              if (!editingTopic) return null;
              const result = await updateTopic(editingTopic.id, { name, description });
              if (result.error) return result.error;
              toast("Topic updated", "success");
              router.refresh();
              return null;
            }}
          />

          <ConfirmDialog
            open={!!deletingTopic}
            title="Delete topic?"
            description={`"${deletingTopic?.name ?? ""}" will be permanently removed.`}
            confirmLabel="Delete"
            destructive
            onClose={() => setDeletingTopic(null)}
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
