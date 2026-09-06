import type { Message } from "@/types/database";

export interface ChatThreadProps {
  messages: Message[];
  currentUserId: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

/**
 * Renders a list of messages between two people, oldest first, aligned by
 * sender: the signed-in user's own messages on the right, the other
 * person's on the left. Shared between the owner and teacher messages
 * pages since the chat-bubble UI is identical for both.
 */
export function ChatThread({ messages, currentUserId }: ChatThreadProps) {
  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId;
        return (
          <div key={message.id} className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] break-words rounded-2xl px-4 py-2 text-sm ${
                isOwn
                  ? "rounded-br-sm bg-primary-600 text-white"
                  : "rounded-bl-sm bg-neutral-100 text-neutral-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className={`mt-1 text-[11px] ${isOwn ? "text-primary-100" : "text-neutral-500"}`}>
                {formatTimestamp(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
