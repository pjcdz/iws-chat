import { google } from "@ai-sdk/google";
import { wrapLanguageModel as wrapLanguageModel } from "ai";

import { customMiddleware } from "./custom-middleware";

export const geminiProModel = wrapLanguageModel({
  model: google("gemini-1.5-flash"),
  middleware: customMiddleware,
});

export const geminiFlashModel = wrapLanguageModel({
  model: google("gemini-1.5-flash"),
  middleware: customMiddleware,
});
