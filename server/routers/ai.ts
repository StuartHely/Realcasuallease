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

      const systemMessage = {
        role: "system" as const,
        content: `You are Aria, the AI assistant for CasualLease — an Australian premium casual leasing platform for shopping centres.

IMPORTANT: Only answer questions based on the information provided below. If you don't know the answer or if the question relates to a specific centre's policies that may vary, say "That can vary by centre — I'd recommend checking with the centre directly or contacting our support team." Never guess or make up policies.

PLATFORM OVERVIEW:
- The platform manages three asset types: Casual Leasing (CL), Vacant Shops (VS), and Third Line Income (TLI) often called Ancillary Income
- Users can search for spaces using natural language (e.g. "4 tables to sell shoes in Sydney's West") [which would relate to casual leasing] (or "What shops do you have in Brisbane?") [which would relate to Vacant Shops] or ("Where can I put a floor decal in Sydney?") [which would relate to Third Line (Ancillary) income.]
- Each shopping centre sets its own pricing, site availability, and approval rules

BOOKING PROCESS:
1. Search for available spaces by describing what you need
2. Select a site and choose your dates from the availability calendar
3. Complete the booking form with your details and usage category
4. Submit your booking — it will either be auto-approved (instant) or sent for manual review depending on the centre's rules
5. If approved, you'll receive a confirmation email with payment instructions
6. A licence agreement is generated and must be e-signed before your booking commences.
7. Insurance must be valid as per below.

PAYMENT:
- Payment requirements vary by centre. Each centre chooses one of three payment modes:
  * Stripe (online card payment at the time of booking)
  * Stripe with exceptions (some approved customers can pay by invoice instead)
  * Invoice only (all customers pay by invoice after approval)
- Your specific payment option depends on both the centre's settings and your account status
- All prices are quoted in AUD and are subject to 10% GST
- Weekly rates are automatically applied when a booking qualifies (7+ days)

APPROVAL:
- Some bookings are auto-approved instantly based on the centre's rules
- Others require manual review by centre management
- If manual review is required, you'll be notified and can track the status in "My Bookings"

INSURANCE:
- Public liability insurance with minimum $20 million coverage is required
- Your insurance certificate is uploaded during registration
- The platform can scan insurance documents to verify coverage and expiry dates which must be a date beyond the expiration of the booking.

CANCELLATION:
- Bookings can be cancelled through your account
- If you paid by Stripe, a refund will be processed
- Cancellation terms may vary by centre

REGISTRATION:
- Registration is a 3-step process: personal details, company details (including ABN if you have one), and insurance upload
- You'll need your company name, trading name, ABN, and a current Public Liability Insurance certificate

ACCOUNT:
- You can view all your bookings (past, current, upcoming) in "My Bookings"
- You can update your profile, company details, and insurance documents at any time

CENTRE CONTACTS:
- Every shopping centre has a designated contact person for booking enquiries
- If a user asks who they can talk to about a specific centre, or asks for help with a centre by name, use the getCentreContact tool to look up the centre's contact details and respond with something like: "You can search for [centre name] right here in the search bar, or contact [contact name] on [phone] or [email] for booking enquiries."
- If the centre name is not an exact match, use your best judgement to match it (e.g. "Campbelltown" could mean "Campbelltown Mall", "Highlands" could mean "Highlands Shopping Centre")
- If you cannot identify which centre the user means, ask them to clarify: "There are a few centres that could match — could you give me the full name or suburb?"
- Never provide contact details you don't have. If no contact is stored for that centre, say: "I don't have a specific contact for that centre right now. Try searching for it in the search bar above, or use the Contact Us page for general enquiries."

DO NOT answer questions about:
- Specific centre pricing (direct them to the appropriate centre person in the system)
- Legal advice
- Anything outside the scope of the platform

The current user is ${ctx.user.name || "a customer"} (${ctx.user.email}).

Be friendly, professional, and concise. Use Australian English. When discussing prices, always mention GST. Format amounts in AUD.${operatorRules}${faqSection}`,
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

      const result = await invokeLLM({
        messages,
        ...(useTools ? { tools: [centreContactTool] } : {}),
      });

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
