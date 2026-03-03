import type { ParsedQuery } from "../shared/queryParser";
import { invokeLLM } from "./_core/llm";

/**
 * Determine whether the query is complex enough to benefit from LLM parsing.
 * Returns true when the rule-based parser left the centre name empty or
 * the original query looks like natural language (long, conversational).
 */
export function shouldUseLLM(parsed: ParsedQuery): boolean {
  // If rule-based parser found nothing useful, try LLM
  if (!parsed.centreName && !parsed.matchedLocation && !parsed.productCategory) {
    return true;
  }
  // If the original query is long / conversational, LLM may extract more
  if (parsed.originalQuery.split(/\s+/).length >= 8) {
    return true;
  }
  return false;
}

export type LLMIntent = {
  location?: string;
  state?: string;
  productCategory?: string;
  assetType?: "casual" | "vacant_shop" | "third_line";
  minSizeM2?: number;
  maxPricePerDay?: number;
  maxPricePerWeek?: number;
  maxBudget?: number;
};

/**
 * Use the LLM to extract structured search intent from a natural-language query.
 * Checks the intent cache first to avoid redundant LLM calls.
 * Returns null if the LLM call fails or returns nothing useful.
 */
export async function parseIntentWithLLM(query: string): Promise<LLMIntent | null> {
  // Check cache first
  const { getCachedIntent, cacheIntent } = await import("./intentCache");
  const cached = await getCachedIntent(query);
  if (cached) return cached;

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a search intent parser for an Australian casual-leasing marketplace.
Extract structured fields from the user's search query. Return ONLY valid JSON with these optional fields:
- location: suburb, city, or area name (e.g. "Bondi Junction", "Brisbane")
- state: Australian state code (NSW, VIC, QLD, SA, WA, TAS, NT, ACT)
- productCategory: product type (e.g. "shoes", "food", "clothing")
- assetType: one of "casual", "vacant_shop", "third_line"
- minSizeM2: minimum size in square metres (number)
- maxPricePerDay: max daily price (number)
- maxPricePerWeek: max weekly price (number)
- maxBudget: total budget (number)
Only include fields you are confident about. Return {} if nothing can be extracted.`,
        },
        { role: "user", content: query },
      ],
      maxTokens: 256,
    });

    const text =
      typeof result.choices?.[0]?.message?.content === "string"
        ? result.choices[0].message.content
        : "";
    if (!text) return null;

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as LLMIntent;
    // Return null if completely empty
    if (Object.keys(parsed).length === 0) return null;

    // Cache the result for future identical queries
    await cacheIntent(query, parsed);

    return parsed;
  } catch {
    // LLM failures are non-fatal — fall back to rule-based only
    return null;
  }
}

/**
 * Merge LLM-extracted intent into an existing ParsedQuery, filling gaps only.
 * Rule-based values always take priority.
 */
export function mergeLLMIntent(parsed: ParsedQuery, intent: LLMIntent): ParsedQuery {
  return {
    ...parsed,
    centreName: parsed.centreName || intent.location || "",
    matchedLocation: parsed.matchedLocation || intent.location,
    stateFilter: parsed.stateFilter || intent.state,
    productCategory: parsed.productCategory || intent.productCategory,
    assetType: parsed.assetType || intent.assetType,
    minSizeM2: parsed.minSizeM2 ?? intent.minSizeM2,
    maxPricePerDay: parsed.maxPricePerDay ?? intent.maxPricePerDay,
    maxPricePerWeek: parsed.maxPricePerWeek ?? intent.maxPricePerWeek,
    maxBudget: parsed.maxBudget ?? intent.maxBudget,
  };
}
