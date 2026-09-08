"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ChatThread } from "@/components/examination/chat-thread";
import { Bdi } from "@/components/shared/bdi";
import { sendMessage, markMessagesRead } from "@/lib/messaging/actions";
import type { Message, Profile } from "@/types/database";

interface MessagesClientProps {
  currentUserId: string;
  profiles: Profile[];
  messages: Message[];
  roleLabel: string;
}

function MessagesInner({ currentUserId, profiles, messages, roleLabel }: MessagesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startReadTransition] = useTransition();

  const recipients = useMemo(
    () => profiles.filter((profile) => profile.user_id !== currentUserId && profile.is_active),
    [profiles, currentUserId]
  );

  const unreadByUser = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of messages) {
      if (message.recipient_id === currentUserId && message.read_at === null) {
        counts.set(message.sender_id, (counts.get(message.sender_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [messages, currentUserId]);

  const latestByUser = useMemo(() => {
    const latest = new Map<string, Message>();
    for (const message of messages) {
      const otherUserId = message.sender_id === currentUserId ? message.recipient_id : message.sender_id;
      const existing = latest.get(otherUserId);
      if (!existing || new Date(message.created_at).getTime() > new Date(existing.created_at).getTime()) {
        latest.set(otherUserId, message);
      }
    }
    return latest;
  }, [messages, currentUserId]);

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? recipients.filter((profile) =>
          [profile.full_name, profile.role, profile.designation ?? "", profile.username ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : recipients;

    return [...filtered].sort((a, b) => {
      const unreadDiff = (unreadByUser.get(b.user_id) ?? 0) - (unreadByUser.get(a.user_id) ?? 0);
      if (unreadDiff !== 0) return unreadDiff;

      const latestA = latestByUser.get(a.user_id);
      const latestB = latestByUser.get(b.user_id);
      const latestTimeA = latestA ? new Date(latestA.created_at).getTime() : 0;
      const latestTimeB = latestB ? new Date(latestB.created_at).getTime() : 0;
      if (latestTimeA !== latestTimeB) return latestTimeB - latestTimeA;

      return a.full_name.localeCompare(b.full_name);
    });
  }, [recipients, search, unreadByUser, latestByUser]);

  const selectedProfile = recipients.find((profile) => profile.user_id === selectedUserId) ?? null;

  const threadMessages = useMemo(() => {
    if (!selectedUserId) return [];
    return messages.filter(
      (message) =>
        (message.sender_id === currentUserId && message.recipient_id === selectedUserId) ||
        (message.sender_id === selectedUserId && message.recipient_id === currentUserId)
    );
  }, [messages, currentUserId, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) return;
    if ((unreadByUser.get(selectedUserId) ?? 0) === 0) return;
    startReadTransition(() => {
      void markMessagesRead(selectedUserId);
    });
  }, [selectedUserId, unreadByUser]);

  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setBody("");
  }

  function backToList() {
    setSelectedUserId(null);
    setBody("");
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfile || !body.trim() || submitting) return;

    setSubmitting(true);
    const result = await sendMessage(selectedProfile.user_id, body);
    setSubmitting(false);

    if (result.error) {
      toast(result.error, "danger");
      return;
    }

    setBody("");
    toast("Message sent", "success");
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col p-3 sm:p-5">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Messages</h1>
          <p className="text-xs text-neutral-500">{roleLabel} · message any active staff member</p>
        </div>
        {selectedProfile && (
          <Button type="button" size="sm" variant="ghost" onClick={backToList} className="md:hidden">
            Back
          </Button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${selectedProfile ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white`}>
          <div className="shrink-0 border-b border-neutral-200 p-3">
            <label htmlFor="message-search" className="sr-only">Search people</label>
            <input
              id="message-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people…"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filteredRecipients.length === 0 ? (
              <div className="p-4 text-sm text-neutral-500">No active staff found.</div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filteredRecipients.map((profile) => {
                  const unread = unreadByUser.get(profile.user_id) ?? 0;
                  const latest = latestByUser.get(profile.user_id);
                  return (
                    <li key={profile.user_id}>
                      <button
                        type="button"
                        onClick={() => selectUser(profile.user_id)}
                        className={`flex min-h-[68px] w-full items-center gap-3 px-3 py-3 text-left hover:bg-neutral-50 ${selectedUserId === profile.user_id ? "bg-primary-50" : ""}`}
                      >
                        <Avatar name={profile.full_name} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className={`truncate text-sm ${unread > 0 ? "font-bold text-neutral-950" : "font-medium text-neutral-900"}`}><Bdi>{profile.full_name}</Bdi></span>
                            {unread > 0 && <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold text-white">{unread}</span>}
                          </span>
                          <span className="block truncate text-xs text-neutral-500">
                            {profile.role.replace("_", " ")}{latest ? ` · ${latest.body}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className={`${selectedProfile ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white`}>
          {selectedProfile ? (
            <>
              <header className="flex min-h-[60px] shrink-0 items-center gap-3 border-b border-neutral-200 px-3 sm:px-4">
                <Button type="button" size="sm" variant="ghost" onClick={backToList} className="md:hidden">‹</Button>
                <Avatar name={selectedProfile.full_name} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900"><Bdi>{selectedProfile.full_name}</Bdi></div>
                  <div className="truncate text-xs capitalize text-neutral-500">{selectedProfile.designation ?? selectedProfile.role.replace("_", " ")}</div>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
                {threadMessages.length === 0 ? (
                  <EmptyState title="No messages yet" description={`Start a conversation with ${selectedProfile.full_name}.`} />
                ) : (
                  <ChatThread messages={threadMessages} currentUserId={currentUserId} />
                )}
              </div>

              <form onSubmit={handleSend} className="shrink-0 border-t border-neutral-200 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Textarea
                      label="Message"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="Type a message…"
                      autoComplete="off"
                      enterKeyHint="send"
                      rows={2}
                      className="min-h-[44px] max-h-32 resize-none text-base sm:text-sm"
                      disabled={submitting}
                      required
                    />
                  </div>
                  <Button type="submit" size="md" loading={submitting} disabled={!body.trim()}>Send</Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Choose someone to message</h2>
                <p className="mt-1 text-sm text-neutral-500">Every active School OS staff account is available here.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function MessagesClient(props: MessagesClientProps) {
  return <ToastProvider><MessagesInner {...props} /></ToastProvider>;
}
