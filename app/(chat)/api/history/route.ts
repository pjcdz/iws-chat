import { auth } from "@/app/(auth)/auth";
import { getChatsByUserId } from "@/db/queries";
import { getTitleFromChat, convertToUIMessages } from "@/lib/utils";

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();

  if (!session || !session.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chats = await getChatsByUserId({ id: session.user.id });

    // Normalize older rows where messages might be stored as string
    const items = chats.map((chat) => {
      let normalizedMessages: any = chat.messages as any;
      if (typeof normalizedMessages === 'string') {
        try {
          normalizedMessages = JSON.parse(normalizedMessages);
        } catch (e) {
          normalizedMessages = [];
        }
      }
      const uiMessages = convertToUIMessages(Array.isArray(normalizedMessages) ? normalizedMessages : []);
      const normalizedChat = { ...chat, messages: uiMessages } as any;

      return {
        id: normalizedChat.id,
        createdAt: normalizedChat.createdAt,
        userId: normalizedChat.userId,
        messages: normalizedChat.messages,
        title: getTitleFromChat(normalizedChat),
      };
    });

    return Response.json(items);
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
