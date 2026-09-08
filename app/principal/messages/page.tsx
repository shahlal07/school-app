import { MessagesClient } from "@/components/messaging/messages-client";
import { getMessagingData } from "@/lib/messaging/data";

export default async function PrincipalMessagesPage() {
  const { profile, people, messages } = await getMessagingData();
  return (
    <MessagesClient
      currentUserId={profile.user_id}
      profiles={people}
      messages={messages}
      roleLabel="Principal"
    />
  );
}
