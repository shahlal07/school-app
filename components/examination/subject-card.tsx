"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Chapter, Subject, Topic } from "@/types/examination";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RenameDialog } from "@/components/examination/rename-dialog";
import { ConfirmDialog } from "@/components/examination/confirm-dialog";
import { ChapterPanel } from "@/components/examination/chapter-panel";
import { updateSubject, deleteSubject } from "@/app/owner/syllabus/actions";

interface SubjectCardProps {
  subject: Subject;
  chapters: Chapter[];
  topicsByChapter: Record<string, Topic[]>;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Hides rename/activate/delete controls (here and in the nested
   * ChapterPanel/TopicPanel) - used on the principal's read-only syllabus
   * view, since principal's RLS grants read but not write on academics. */
  readOnly?: boolean;
}

export function SubjectCard({
  subject,
  chapters,
  topicsByChapter,
  expanded,
  onToggleExpand,
  readOnly = false
}: SubjectCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const chapterCount = chapters.length;

  const handleToggleActive = async () => {
    setTogglingActive(true);
    const result = await updateSubject(subject.id, { is_active: !subject.is_active });
    setTogglingActive(false);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    toast(subject.is_active ? "Subject deactivated" : "Subject activated", "success");
    router.refresh();
  };

  const handleDelete = async () => {
    const result = await deleteSubject(subject.id);
    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    toast("Subject deleted", "success");
    setDeleting(false);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-neutral-900">
              {subject.name}
            </span>
            {subject.group_name && <Badge variant="info">{subject.group_name}</Badge>}
            {!subject.is_active && <Badge variant="danger">Inactive</Badge>}
          </div>
          <span className="text-xs text-neutral-500">
            {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
          </span>
        </button>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={togglingActive}
              onClick={handleToggleActive}
            >
              {subject.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
              <span className="text-danger-600">Delete</span>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <button
          type="button"
          onClick={onToggleExpand}
          className="mb-2 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          {expanded ? "Hide chapters" : readOnly ? "View chapters" : "Manage chapters"}
        </button>
        {expanded && (
          <ChapterPanel
            subjectId={subject.id}
            chapters={chapters}
            topicsByChapter={topicsByChapter}
            readOnly={readOnly}
          />
        )}
      </CardContent>

      {!readOnly && (
        <>
          <RenameDialog
            open={renaming}
            title="Rename subject"
            label="Subject name"
            initialValue={subject.name}
            onClose={() => setRenaming(false)}
            onSubmit={async (name) => {
              const result = await updateSubject(subject.id, { name });
              if (result.error) return result.error;
              toast("Subject renamed", "success");
              router.refresh();
              return null;
            }}
          />

          <ConfirmDialog
            open={deleting}
            title="Delete subject?"
            description={`"${subject.name}" and all of its chapters and topics will be permanently removed. This cannot be undone.`}
            confirmLabel="Delete"
            destructive
            onClose={() => setDeleting(false)}
            onConfirm={handleDelete}
          />
        </>
      )}
    </Card>
  );
}
