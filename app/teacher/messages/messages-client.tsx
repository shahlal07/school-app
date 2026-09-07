"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ChatThread } from "@/components/examination/chat-thread";
import { useTranslation } from "@/lib/i18n/locale-provider";
import type { Message, Profile } from "@/types/database";

import { markOwnerMessagesRead, sendMessageToOwner } from "./actions";

interface TeacherMessagesClientProps {
  teacherUserId: string;
  owner: Profile | null;
  messages: Message[];
}

function TeacherMessagesInner({ teacherUserId, owner, messages }: TeacherMessagesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startReadTransition] = useTransition();

  const hasUnread = useMemo(
    () => messages.some((message) => message.recipient_id === teacherUserId && message.read_at === null),
    [messages, teacherUserId]
  );

  useEffect(() => {
    if (hasUnread) startReadTransition(() => { void markOwnerMessagesRead(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner || !replyBody.trim()) return;
    setSubmitting(true);
    const result = await sendMessageToOwner(owner.user_id, replyBody);
    setSubmitting(false);
    if (result.error) return toast(result.error, "danger");
    setReplyBody("");
    toast(t("teacher.messages.toastSent"), "success");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-3">
      <h1 className="text-lg font-semibold text-neutral-900">{t("nav.messages")}</h1>
      <div className="min-h-[260px] flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-4">
        {messages.length === 0 ? <EmptyState title={t("teacher.messages.emptyTitle")} description={t("teacher.messages.emptyDescription")} /> : <ChatThread messages={messages} currentUserId={teacherUserId} />}
      </div>
      <form
        onSubmit={handleReply}
        className="sticky z-50 flex items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="min-w-0 flex-1">
          <Textarea label={t("teacher.messages.replyLabel")} className="min-h-[44px]" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder={t("teacher.messages.replyPlaceholder")} required disabled={!owner} />
        </div>
        <Button type="submit" size="md" loading={submitting} disabled={!owner || !replyBody.trim()}>{t("teacher.messages.send")}</Button>
      </form>
    </div>
  );
}

export function TeacherMessagesClient(props: TeacherMessagesClientProps) {
  return <ToastProvider><TeacherMessagesInner {...props} /></ToastProvider>;
}
