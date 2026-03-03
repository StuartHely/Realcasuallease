import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { checkRateLimit } from "../_core/rateLimit";

const AI_DAILY_LIMIT = 20;
const AI_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { allowed, retryAfterMs } = checkRateLimit(`ai:${ctx.user.id}`, AI_DAILY_LIMIT, AI_WINDOW_MS);
      if (!allowed) {
        const hoursLeft = Math.ceil(retryAfterMs / (60 * 60 * 1000));
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `You've reached the daily AI chat limit (${AI_DAILY_LIMIT} messages). Try again in ~${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`,
        });
      }

      const { invokeLLM } = await import("../_core/llm");

      const systemMessage = {
        role: "system" as const,
        content: `You are Aria, the AI assistant for CasualLease — an Australian casual leasing marketplace for shopping centres. You help users find and book retail spaces in shopping centres across Australia.

You can help with:
- Finding available spaces by location, size, or price
- Explaining the booking process
- Answering questions about casual leasing terms
- Providing information about shopping centres and sites
- Helping with account and booking inquiries

The current user is ${ctx.user.name || "a customer"} (${ctx.user.email}).

Be friendly, professional, and concise. Use Australian English. When discussing prices, always mention GST. Format amounts in AUD.`,
      };

      const messages = input.messages[0]?.role === "system"
        ? input.messages
        : [systemMessage, ...input.messages];

      const result = await invokeLLM({ messages });

      const assistantMessage = result.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error("No response from AI");
      }

      return typeof assistantMessage === "string"
        ? assistantMessage
        : assistantMessage.map(p => p.type === "text" ? p.text : "").join("");
    }),
});
