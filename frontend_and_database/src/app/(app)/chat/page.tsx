'use server';

import ChatPageClient from "./page-client";
import { deleteChatSession, renameChatSession, endSessionManually } from "@/lib/actions";

export default async function ChatPage() {
  return (
    <ChatPageClient
      deleteChatSession={deleteChatSession}
      renameChatSession={renameChatSession}
      endSessionManually={endSessionManually}
    />
  );
}