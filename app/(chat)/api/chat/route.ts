import { convertToModelMessages, UIMessage, streamText, smoothStream } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "@/db/queries";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<UIMessage> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToModelMessages(messages).filter((message: any) => {
    const c = message.content as any;
    if (typeof c === 'string') return c.trim().length > 0;
    if (Array.isArray(c)) return c.length > 0;
    return !!c;
  });

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
    // Smooth streaming; keep API responses clean by default
    experimental_transform: smoothStream({
      delayInMs: 8,
      chunking: 'word',
    }) as any,
    // Reduce noisy server logs; enable verbose logs only in development
    onChunk: process.env.DEBUG_STREAM_LOGS === 'true'
      ? ({ chunk }) => {
          switch (chunk.type) {
            case 'text-delta':
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
        }
      : undefined,
    onFinish: process.env.DEBUG_STREAM_LOGS === 'true'
      ? ({ usage }) => {
          console.log('🏁 Generación completada:', {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
          });
        }
      : undefined,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  // validate the provided id to avoid DB errors, but don't break streaming
  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

  const safeId = typeof id === 'string' && isUuid(id) ? id : null;

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      if (!safeId) {
        console.warn("Skipping chat save: invalid chat id provided", { id });
        return;
      }
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id: safeId,
            messages: finalMessages,
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat:", error);
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
