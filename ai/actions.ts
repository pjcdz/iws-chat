import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlashModel } from ".";

// This file can be used for future AI-powered actions
// Currently all flight-related actions have been removed
// as the app has been converted to a general AI chat assistant

export async function exampleAction() {
  // Example function - can be removed or used as a template
  const { object: result } = await generateObject({
    model: geminiFlashModel,
    prompt: "Example prompt",
    schema: z.object({
      message: z.string().describe("Example message"),
    }),
  });

  return result;
}
