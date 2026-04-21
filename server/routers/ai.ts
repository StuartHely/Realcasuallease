import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { checkRateLimit } from "../_core/rateLimit";

const AI_DAILY_LIMIT = 20;
const AI_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const centreContactTool = {
  type: "function" as const,
  function: {
    name: "getCentreContact",
    description: "Look up the contact person for a shopping centre by name. ONLY use this tool when a user explicitly mentions a specific shopping centre by name AND asks for contact details, who to talk to, or how to get in touch. Do NOT use for general platform questions about payment, insurance, bookings, or registration.",
    parameters: {
      type: "object",
      properties: {
        centreName: {
          type: "string",
          description: "The name or partial name of the shopping centre to search for"
        }
      },
      required: ["centreName"]
    }
  }
};

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

      // Load operator-specific knowledge base if tenant context exists
      let operatorRules = "";
      if (ctx.tenantOwnerId) {
        const { getOwnerById } = await import("../db");
        const owner = await getOwnerById(ctx.tenantOwnerId);
        if (owner?.ariaKnowledgeBase) {
          operatorRules = `\n\nOPERATOR-SPECIFIC RULES:\n${owner.ariaKnowledgeBase}`;
        }
      }

      // Load active FAQs
      let faqSection = "";
      try {
        const { getDb } = await import("../db");
        const { faqs } = await import("../../drizzle/schema");
        const { eq, asc } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          const activeFaqs = await db.select().from(faqs).where(eq(faqs.isActive, true)).orderBy(asc(faqs.displayOrder));
          if (activeFaqs.length > 0) {
            const faqEntries = activeFaqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
            faqSection = `\n\nFREQUENTLY ASKED QUESTIONS:\n${faqEntries}`;
          }
        }
      } catch {}

      // Select system prompt based on user role — admin/owner users get admin
      // knowledge, customers get customer knowledge. Prompts are in separate
      // files so admin instructions can never leak to customers.
      const isAdminOrOwner = ctx.user.role !== "customer";
      let promptContent: string;

      if (isAdminOrOwner) {
        const { getAdminSystemPrompt } = await import("../aria/adminPrompt");
        promptContent = getAdminSystemPrompt(
          ctx.user.name || "an administrator",
          ctx.user.email || "",
          ctx.user.role,
          operatorRules,
          faqSection,
        );
      } else {
        const { getCustomerSystemPrompt } = await import("../aria/customerPrompt");
        promptContent = getCustomerSystemPrompt(
          ctx.user.name || "a customer",
          ctx.user.email || "",
          operatorRules,
          faqSection,
        );
      }

      const systemMessage = {
        role: "system" as const,
        content: promptContent,
      };

      const messages = input.messages[0]?.role === "system"
        ? input.messages
        : [systemMessage, ...input.messages];

      // Only provide the contact tool when the user's message suggests they're
      // asking about a specific centre or wanting contact details. This prevents
      // Gemini from aggressively calling the tool on general platform questions.
      const lastUserMsg = [...input.messages].reverse().find(m => m.role === "user")?.content?.toLowerCase() ?? "";
      const contactKeywords = /\b(contact|phone|email|call|speak|talk|reach|enquir|who do i|get in touch|centre manager|center manager)\b/i;
      const useTools = contactKeywords.test(lastUserMsg);

      let result;
      try {
        result = await invokeLLM({
          messages,
          ...(useTools ? { tools: [centreContactTool] } : {}),
        });
      } catch (llmError: any) {
        console.error("[AI] LLM invocation failed:", llmError.message, llmError.stack);
        return "I'm sorry, I'm temporarily unable to respond. Please try again shortly.";
      }

      const choice = result.choices[0];
      if (!choice) {
        throw new Error("No response from AI");
      }

      // Check if the LLM wants to call a tool
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];

        if (toolCall.function.name === "getCentreContact") {
          const { findCentreContact } = await import("../db");
          const args = JSON.parse(toolCall.function.arguments);
          const centres = await findCentreContact(args.centreName);

          // Build the follow-up messages with tool result
          const followUpMessages = [
            ...messages,
            {
              role: "assistant" as const,
              content: choice.message.content || "",
              tool_calls: choice.message.tool_calls,
            },
            {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(centres),
            },
          ];

          const followUp = await invokeLLM({ messages: followUpMessages });
          const followUpMessage = followUp.choices[0]?.message?.content;
          if (!followUpMessage) {
            throw new Error("No response from AI");
          }

          return typeof followUpMessage === "string"
            ? followUpMessage
            : followUpMessage.map(p => p.type === "text" ? p.text : "").join("");
        }
      }

      // Normal response (no tool call)
      const assistantMessage = choice.message.content;
      if (!assistantMessage) {
        throw new Error("No response from AI");
      }

      return typeof assistantMessage === "string"
        ? assistantMessage
        : assistantMessage.map(p => p.type === "text" ? p.text : "").join("");
    }),
});
