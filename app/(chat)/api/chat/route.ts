import { convertToModelMessages, UIMessage, streamText, smoothStream } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<UIMessage> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToModelMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const result = streamText({
    model: geminiProModel,
    system: `You are a helpful AI assistant. You can help users with various tasks and questions. 
      - Be concise and helpful in your responses.
      - Today's date is ${new Date().toLocaleDateString()}.
      - If you don't know something, just say so.
      - You can check the weather for any location if needed.`,
    messages: coreMessages,
    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        inputSchema: z.object({
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
        }),
        execute: async ({ latitude, longitude }) => {
          console.log(`📍 Consultando clima para: ${latitude}, ${longitude}`);
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
    },
    // Streaming suave - palabra por palabra con delay mínimo
    experimental_transform: smoothStream({
      delayInMs: 8, // 8ms entre chunks para experiencia ultra-suave
      chunking: 'word', // Palabra por palabra
    }) as any,
    // Callbacks mejorados para debugging y UX
    onChunk({ chunk }) {
      switch (chunk.type) {
        case 'text-delta':
          // Texto siendo generado palabra por palabra
          process.stdout.write(chunk.text);
          break;
        case 'tool-call':
          console.log('🔧 Tool llamada:', chunk.toolName);
          break;
        case 'tool-result':
          console.log('✅ Tool resultado recibido');
          break;
        case 'reasoning-delta':
          console.log('🤔 Model reasoning delta:', chunk.text.slice(0, 30));
          break;
      }
    },
    onFinish({ usage }) {
      console.log('🏁 Generación completada:', {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      });
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: finalMessages,
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
