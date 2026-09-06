"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ChatThread } from "@/components/examination/chat-thread";
import type { Message, Profile } from "@/types/database";
import { useTranslation } from "@/lib/i18n/locale-provider";
import { Bdi } from "@/components/shared/bdi";

import { markThreadReadForTeacher, sendBroadcastToTeachers, sendMessageToTeacher } from "./actions";

interface OwnerMessagesClientProps {
  ownerUserId: string;
  teachers: Profile[];
  messages: Message[];
  selectedTeacherId: string | null;
  /** Base route this client is mounted at - owner and academic_coordinator
   * both reuse this exact component from different segments. */
  basePath?: string;
}

interface ConversationSummary {
  teacher: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

function buildConversations(
  teachers: Profile[],
  messages: Message[],
  ownerUserId: string
): ConversationSummary[] {
  const byTeacher = new Map<string, Message[]>();
  for (const message of messages) {
    const teacherId = message.sender_id === ownerUserId ? message.recipient_id : message.sender_id;
    const existing = byTeacher.get(teacherId);
    if (existing) {
      existing.push(message);
    } else {
      byTeacher.set(teacherId, [message]);
    }
  }

  const summaries: ConversationSummary[] = teachers.map((teacher) => {
    const teacherMessages = byTeacher.get(teacher.user_id) ?? [];
    const lastMessage = teacherMessages.length > 0 ? teacherMessages[teacherMessages.length - 1] : null;
    const unreadCount = teacherMessages.filter(
      (message) =>
        message.recipient_id === ownerUserId &&
        message.sender_id === teacher.user_id &&
        message.read_at === null
    ).length;
    return { teacher, lastMessage, unreadCount };
  });

  return summaries.sort((a, b) => {
    if (a.lastMessage && b.lastMessage) {
      return (
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );
    }
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    return a.teacher.full_name.localeCompare(b.teacher.full_name);
  });
}

function OwnerMessagesInner({
  ownerUserId,
  teachers,
  messages,
  selectedTeacherId,
  basePath = "/owner/messages"
}: OwnerMessagesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [, startReadTransition] = useTransition();

  const conversations = useMemo(
    () => buildConversations(teachers, messages, ownerUserId),
    [teachers, messages, ownerUserId]
  );

  const selectedTeacher = teachers.find((teacher) => teacher.user_id === selectedTeacherId) ?? null;

  const threadMessages = useMemo(() => {
    if (!selectedTeacher) return [];
    return messages.filter(
      (message) =>
        (message.sender_id === ownerUserId && message.recipient_id === selectedTeacher.user_id) ||
        (message.sender_id === selectedTeacher.user_id && message.recipient_id === ownerUserId)
    );
  }, [messages, ownerUserId, selectedTeacher]);

  const selectedSummary = conversations.find((c) => c.teacher.user_id === selectedTeacherId);
  const hasUnreadInSelectedThread = (selectedSummary?.unreadCount ?? 0) > 0;

  useEffect(() => {
    if (selectedTeacherId && hasUnreadInSelectedThread) {
      startReadTransition(() => {
        void markThreadReadForTeacher(selectedTeacherId);
      });
    }
    // Only re-run when the selected thread changes or new unread arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacherId, hasUnreadInSelectedThread]);

  function selectTeacher(teacherUserId: string) {
    router.push(`${basePath}?teacher=${teacherUserId}`);
  }

  function backToList() {
    router.push(basePath);
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeacher) return;
    setReplySubmitting(true);
    const result = await sendMessageToTeacher(selectedTeacher.user_id, replyBody);
    setReplySubmitting(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    setReplyBody("");
  }

  async function handleBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBroadcastSubmitting(true);
    setBroadcastError(null);

    const result = await sendBroadcastToTeachers(broadcastBody);
    setBroadcastSubmitting(false);

    if (result.error) {
      setBroadcastError(result.error);
      return;
    }

    toast(t("owner.messages.broadcastSent"), "success");
    setBroadcastOpen(false);
    setBroadcastBody("");
  }

  if (teachers.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900">{t("nav.messages")}</h1>
        <EmptyState
          title={t("owner.messages.noOneToMessage")}
          description={t("owner.messages.noOneToMessageDescription")}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 sm:p-6 md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-neutral-900">{t("nav.messages")}</h1>
        <Button size="sm" onClick={() => setBroadcastOpen(true)}>
          {t("owner.messages.broadcastToAll")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-[280px_1fr]">
        <div
          className={`min-h-0 overflow-y-auto rounded-2xl border border-neutral-200 bg-white ${
            selectedTeacher ? "hidden md:block" : "block"
          }`}
        >
          <ul className="divide-y divide-neutral-100">
            {conversations.map(({ teacher, lastMessage, unreadCount }) => (
              <li key={teacher.id}>
                <button
                  type="button"
                  onClick={() => selectTeacher(teacher.user_id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                    teacher.user_id === selectedTeacherId ? "bg-primary-50" : ""
                  }`}
                >
                  <Avatar name={teacher.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900">
                        <Bdi>{teacher.full_name}</Bdi>
                      </span>
                      {unreadCount > 0 && <Badge variant="info"><Bdi>{unreadCount}</Bdi></Badge>}
                    </div>
                    <p className="truncate text-xs text-neutral-500">
                      {lastMessage ? <Bdi>{lastMessage.body}</Bdi> : t("owner.messages.noMessagesYet")}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`flex min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white ${
            selectedTeacher ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedTeacher ? (
            <>
              <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
                <button
                  type="button"
                  onClick={backToList}
                  aria-label={t("owner.messages.backToConversations")}
                  className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 md:hidden"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <Avatar name={selectedTeacher.full_name} size="sm" />
                <span className="text-sm font-semibold text-neutral-900"><Bdi>{selectedTeacher.full_name}</Bdi></span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {threadMessages.length === 0 ? (
                  <EmptyState
                    title={t("owner.messages.noMessagesYet")}
                    description={`${t("owner.messages.startConversationWith")} ${selectedTeacher.full_name}.`}
                  />
                ) : (
                  <ChatThread messages={threadMessages} currentUserId={ownerUserId} />
                )}
              </div>

              <form onSubmit={handleReply} className="flex items-end gap-2 border-t border-neutral-200 p-3">
                <div className="flex-1">
                  <Textarea
                    label={t("owner.messages.replyLabel")}
                    className="min-h-[44px]"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder={t("owner.messages.writeMessagePlaceholder")}
                    required
                  />
                </div>
                <Button type="submit" size="md" loading={replySubmitting}>
                  {t("owner.messages.send")}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-neutral-500">{t("owner.messages.selectConversation")}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        title={t("owner.messages.broadcastDialogTitle")}
        description={t("owner.messages.broadcastDialogDescription")}
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          {broadcastError && (
            <p role="alert" className="text-sm text-danger-600">
              {broadcastError}
            </p>
          )}
          <Textarea
            label={t("owner.messages.messageLabel")}
            value={broadcastBody}
            onChange={(event) => setBroadcastBody(event.target.value)}
            placeholder={t("owner.messages.announcementPlaceholder")}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setBroadcastOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={broadcastSubmitting}>
              {t("owner.messages.sendToAllTeachers")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function OwnerMessagesClient(props: OwnerMessagesClientProps) {
  return (
    <ToastProvider>
      <OwnerMessagesInner {...props} />
    </ToastProvider>
  );
}
