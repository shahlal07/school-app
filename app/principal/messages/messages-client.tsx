"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ChatThread } from "@/components/examination/chat-thread";
import type { Message, Profile } from "@/types/database";

import { markOwnerMessagesRead, sendMessageToOwner } from "./actions";

interface PrincipalMessagesClientProps {
  principalUserId: string;
  owner: Profile | null;
  messages: Message[];
}

/**
 * Direct adaptation of app/teacher/messages/messages-client.tsx's
 * TeacherMessagesClient - principal can only message the owner (see the
 * RLS note in ./actions.ts), so this is a single-thread "message the
 * owner" UI, not the multi-conversation owner/messages-client.tsx pattern.
 */
function PrincipalMessagesInner({ principalUserId, owner, messages }: PrincipalMessagesClientProps) {
  const { toast } = useToast();
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startReadTransition] = useTransition();

  const hasUnread = useMemo(
    () => messages.some((message) => message.recipient_id === principalUserId && message.read_at === null),
    [messages, principalUserId]
  );

  useEffect(() => {
    if (hasUnread) {
      startReadTransition(() => {
        void markOwnerMessagesRead();
      });
    }
    // Only re-run when unread state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner) return;
    setSubmitting(true);
    const result = await sendMessageToOwner(owner.user_id, replyBody);
    setSubmitting(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    setReplyBody("");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem-4rem)] flex-col gap-3 p-4 sm:p-6 md:h-[calc(100vh-4rem)]">
      <h1 className="text-lg font-semibold text-neutral-900">Messages</h1>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-4">
        {!owner ? (
          <EmptyState
            title="No owner account found"
            description="There is no owner account to message yet."
          />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Your conversation with the school owner will appear here."
          />
        ) : (
          <ChatThread messages={messages} currentUserId={principalUserId} />
        )}
      </div>

      <form onSubmit={handleReply} className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            label="Reply"
            className="min-h-[44px]"
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            placeholder="Write a message to the school owner..."
            required
            disabled={!owner}
          />
        </div>
        <Button type="submit" size="md" loading={submitting} disabled={!owner}>
          Send
        </Button>
      </form>
    </div>
  );
}

export function PrincipalMessagesClient(props: PrincipalMessagesClientProps) {
  return (
    <ToastProvider>
      <PrincipalMessagesInner {...props} />
    </ToastProvider>
  );
}
