import {
  ModelMessage,
  CoreToolMessage,
  generateId,
  UIMessage,
} from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Chat } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data.",
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function convertToUIMessages(
  messages: Array<any>, // Use any to handle both old and new formats
): Array<UIMessage> {
  return messages
    .filter((message) => message.role !== "tool") // Filter out tool messages for now
    .map((message) => {
      // If it's already a v5 UIMessage with parts, return as is
      if (message.parts) {
        return {
          id: message.id || generateId(),
          role: message.role,
          parts: message.parts,
        };
      }
      
      // Handle v3 format with content
      if (message.content) {
        return {
          id: message.id || generateId(),
          role: message.role,
          parts: [{ type: "text" as const, text: message.content }],
        };
      }
      
      // Handle ModelMessage format
      const parts = typeof message.content === "string" 
        ? [{ type: "text" as const, text: message.content }]
        : message.content || [{ type: "text" as const, text: "" }];
      
      return {
        id: message.id || generateId(),
        role: message.role,
        parts,
      };
    });
}

export function getTitleFromChat(chat: Chat) {
  const messages = chat.messages;
  const firstMessage = messages[0];

  if (!firstMessage || !firstMessage.parts) {
    return "Untitled";
  }

  // Find the first text part
  const textPart = firstMessage.parts.find(part => part.type === "text");
  return textPart ? textPart.text : "Untitled";
}
