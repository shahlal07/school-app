"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ChatThread } from "@/components/examination/chat-thread";
import type { Message, Profile } from "@/types/database";

import { markThreadReadForTeacher, sendMessageToTeacher } from "@/app/owner/messages/actions";

interface CoordinatorMessagesClientProps {
  currentUserId: string;
  owner: Profile;
  messages: Message[];
}

function CoordinatorMessagesInner({ currentUserId, owner, messages }: CoordinatorMessagesClientProps) {
  const { toast } = useToast();
  const [replyBody, setReplyBody] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [, startReadTransition] = useTransition();

  const hasUnread = useMemo(
    () =>
      messages.some(
        (message) =>
          message.recipient_id === currentUserId &&
          message.sender_id === owner.user_id &&
          message.read_at === null
      ),
    [messages, currentUserId, owner.user_id]
  );

  useEffect(() => {
    if (hasUnread) {
      startReadTransition(() => {
        void markThreadReadForTeacher(owner.user_id);
      });
    }
    // Only re-run when new unread messages arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReplySubmitting(true);
    const result = await sendMessageToTeacher(owner.user_id, replyBody);
    setReplySubmitting(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }
    setReplyBody("");
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 sm:p-6 md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={owner.full_name} size="sm" />
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Messages</h1>
          <p className="text-xs text-neutral-500">Conversation with {owner.full_name} (Owner)</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description={`Start the conversation with ${owner.full_name}.`}
            />
          ) : (
            <ChatThread messages={messages} currentUserId={currentUserId} />
          )}
        </div>

        <form onSubmit={handleReply} className="flex items-end gap-2 border-t border-neutral-200 p-3">
          <div className="flex-1">
            <Textarea
              label="Message"
              className="min-h-[44px]"
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder="Write a message to the owner..."
              required
            />
          </div>
          <Button type="submit" size="md" loading={replySubmitting}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

export function CoordinatorMessagesClient(props: CoordinatorMessagesClientProps) {
  return (
    <ToastProvider>
      <CoordinatorMessagesInner {...props} />
    </ToastProvider>
  );
}
