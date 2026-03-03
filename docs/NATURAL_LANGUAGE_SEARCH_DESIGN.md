# Natural Language Search — Design & Implementation Plan

## The Vision

Users type conversational queries like:
- "I want to promote a pop-up clothing store in Brisbane"
- "Where can I sell my shoes on the NSW Central Coast?"
- "I need a 3x3m space for a jewellery stall near Campbelltown next month"
- "Any available spots for a food truck in Sydney under $200/day?"

The system interprets what they want to sell/market, where they want to be, when, and returns a ranked list of suitable available sites.

---

## Current State Assessment

### What already exists (and works well)

| Component | Location | Capability |
|-----------|----------|------------|
| **Query parser** | `shared/queryParser.ts` | Extracts centre name, product category, size, tables, dates, date ranges, state codes, asset type |
| **Category synonyms** | `shared/categorySynonyms.ts` | Maps "ugg" → "shoes/footwear", "clothes" → "clothing/apparel", etc. |
| **Location aliases** | `shared/queryParser.ts` L251-261 | Maps "bondi" → "Eastgate Bondi Junction", "campbelltown" → "Campbelltown Mall" |
| **Fuzzy matching** | `shared/queryParser.ts` | Levenshtein distance for typo tolerance |
| **Smart search endpoint** | `server/routers/search.ts` | Combines centre search + site filtering + availability checking |
| **LLM integration** | `server/_core/llm.ts` | AWS Bedrock via Forge API (Gemini 2.5 Flash) — already available |
| **Usage categories** | `drizzle/schema.ts` | 34 predefined categories with site-level approval tracking |
| **Geocoding** | `server/_core/amazonLocation.ts` | Amazon Location Service for lat/lng lookups |
| **Search analytics** | `server/searchAnalyticsDb.ts` | Logs queries, result counts, suggestion clicks |

### What's missing for full natural language

1. **Intent extraction** — the query parser uses regex patterns, which can't handle "I want to promote a pop-up clothing store in Brisbane" because it doesn't understand sentence structure
2. **Geographic reasoning** — "NSW Central Coast" or "Brisbane" can't be mapped to specific centres without knowing centre coordinates/regions
3. **Budget matching** — no way to filter by price
4. **Temporal reasoning** — "next month", "over Christmas", "for 2 weeks" are partially handled but fragile
5. **Ranking** — results aren't ranked by relevance (closest match, best price, most available)

---

## Recommended Architecture

### Two-tier approach: Rules first, LLM as fallback

This avoids unnecessary AI costs for simple queries while handling complex natural language gracefully.

```
User Query
    │
    ▼
┌─────────────────────┐
│  Rule-Based Parser   │  ← Current queryParser.ts (enhanced)
│  (fast, free, local) │
└──────────┬──────────┘
           │
    Can it extract all     YES → Use structured data directly
    needed fields?  ────────────────────────────────┐
           │ NO                                      │
           ▼                                         │
┌─────────────────────┐                             │
│  LLM Intent Parser   │  ← Gemini 2.5 Flash       │
│  (structured output) │    via existing Forge API   │
└──────────┬──────────┘                             │
           │                                         │
           ▼                                         ▼
┌─────────────────────────────────────────────────────┐
│            Unified Search Engine                      │
│  (location matching → site filtering → ranking)       │
└───────────────────────────────────────────────────────┘
```

### Why this approach?
- **Simple queries** ("campbelltown shoes today") use the existing regex parser — instant, no AI cost
- **Complex queries** ("I want to promote a pop-up clothing store in Brisbane") are sent to the LLM for intent extraction
- The LLM returns **structured JSON** (not free text), so the search engine works identically regardless of which parser was used

---

## Phase 1: Enhanced Rule-Based Parser (No AI needed)

**Effort: ~2 days | Impact: Handles 70% of natural language queries**

### 1.1 Add geographic area matching

Currently, `locationAliases` is a hardcoded map of ~9 entries. Enhance it to:

**a) Auto-populate from the database** — on server startup, build a location index from all centres:
```typescript
// New: server/locationIndex.ts
type LocationEntry = {
  centreId: number;
  centreName: string;
  slug: string;
  suburb: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Built on startup, refreshed when centres change
let locationIndex: LocationEntry[] = [];

// Searched by: suburb, city, region name, state
export function findCentresByArea(areaQuery: string): LocationEntry[]
```

**b) Add region/area aliases** — map common Australian area names to centre lists:
```typescript
const areaAliases: Record<string, { suburbs?: string[], states?: string[], postcodeRanges?: [number,number][] }> = {
  "central coast": { postcodeRanges: [[2250, 2263]], states: ["NSW"] },
  "brisbane": { city: "Brisbane", states: ["QLD"] },
  "western sydney": { suburbs: ["Campbelltown", "Penrith", "Parramatta", ...] },
  "gold coast": { city: "Gold Coast", states: ["QLD"] },
  "melbourne cbd": { postcodeRanges: [[3000, 3008]], states: ["VIC"] },
};
```

**c) Proximity search** — "near Bondi" finds centres within 10km using existing `getNearbyCentres()` geocoding.

### 1.2 Add budget/price filtering

**New `ParsedQuery` fields:**
```typescript
maxPricePerDay?: number;    // "under $200/day"
maxPricePerWeek?: number;   // "less than $500 per week"
maxBudget?: number;         // "budget of $2000"
```

**Regex patterns to extract:**
```
/under\s*\$(\d+)\s*(?:per\s*)?(?:day|daily)/i        → maxPricePerDay
/less\s+than\s*\$(\d+)\s*(?:per\s*)?(?:week|weekly)/i → maxPricePerWeek
/budget\s*(?:of|is|:)?\s*\$(\d+)/i                    → maxBudget
```

### 1.3 Add temporal range patterns

Enhance the date parser for natural ranges:
```
"next month"         → startDate: 1st of next month, endDate: last day
"over Christmas"     → Dec 20 to Jan 5 (configurable)
"for 2 weeks"        → duration: 14 days (applied after start date selection)
"this weekend"       → next Saturday–Sunday
"school holidays"    → look up NSW school holiday dates
```

### 1.4 Better filler word removal

The current `extractCentreName` strips some filler words but misses many natural language patterns:
```
"I want to promote a pop-up clothing store in Brisbane"
  → After stripping: "promote pop-up clothing store Brisbane"
  → Category: "clothing"
  → Asset type: "casual" (from "pop-up")
  → Location: "Brisbane"
```

Add more intent verbs: "promote", "showcase", "display", "run", "operate", "host", "launch".

---

## Phase 2: LLM-Powered Intent Parsing (For complex queries)

**Effort: ~3 days | Impact: Handles remaining 30% of queries**

### 2.1 When to invoke the LLM

The rule-based parser runs first. Invoke the LLM only when:
1. No location could be extracted, OR
2. No product category could be identified, OR  
3. The query is longer than ~8 words (suggests conversational language)

### 2.2 LLM structured output schema

Use the existing `invokeLLM()` with `responseFormat: json_schema`:

```typescript
// New: server/intentParser.ts
const INTENT_SCHEMA = {
  name: "search_intent",
  schema: {
    type: "object",
    properties: {
      productCategory: { type: "string", description: "What they want to sell/market: shoes, clothing, food, jewellery, etc." },
      activityType: { type: "string", description: "Type of activity: pop-up shop, market stall, kiosk, brand activation, charity fundraiser" },
      location: {
        type: "object",
        properties: {
          areaName: { type: "string", description: "Area/suburb/city name: Brisbane, Central Coast, Campbelltown" },
          state: { type: "string", enum: ["NSW","VIC","QLD","SA","WA","TAS","NT","ACT"] },
          nearAddress: { type: "string", description: "Specific address if mentioned" },
        }
      },
      dateRange: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "ISO date if specific date mentioned" },
          endDate: { type: "string" },
          duration: { type: "string", description: "e.g. '2 weeks', '1 month'" },
          flexibility: { type: "string", enum: ["exact", "flexible", "anytime"] }
        }
      },
      budget: {
        type: "object",
        properties: {
          maxPerDay: { type: "number" },
          maxPerWeek: { type: "number" },
          maxTotal: { type: "number" },
        }
      },
      sizeRequirements: {
        type: "object",
        properties: {
          minSizeM2: { type: "number" },
          tablesNeeded: { type: "number" },
          powerRequired: { type: "boolean" },
        }
      },
      assetType: { type: "string", enum: ["casual_leasing", "vacant_shop", "third_line", "any"] },
    },
    required: ["productCategory", "location", "assetType"]
  }
};
```

### 2.3 LLM system prompt

```
You are a search intent parser for CasualLease, an Australian shopping centre 
casual leasing platform. Extract structured search parameters from user queries.

Context: Users are looking for temporary retail spaces in Australian shopping centres 
to sell products, run pop-up shops, or place assets (ATMs, vending machines).

Australian geography: Know that "Central Coast" is in NSW (postcodes 2250-2263), 
"Brisbane" is in QLD, "Gold Coast" is in QLD, etc.

If the user doesn't specify a location, set areaName to empty string.
If the user doesn't mention dates, set dateRange to null.
Always try to identify what they want to sell — map it to common retail categories.
```

### 2.4 Caching & cost control

- **Cache LLM results** by query hash (same query = same intent, no re-parsing)
- **Rate limit** LLM calls to 10/minute per user
- **Fallback gracefully** — if LLM fails, use whatever the regex parser extracted
- **Estimated cost**: ~$0.001 per query with Gemini 2.5 Flash at 128 thinking tokens

---

## Phase 3: Ranking & Result Presentation

**Effort: ~3 days | Impact: Much better user experience**

### 3.1 Scoring algorithm

Each site gets a composite score from 0–100:

```typescript
type SiteScore = {
  siteId: number;
  total: number;          // Weighted sum of below
  categoryMatch: number;  // 0-30: Does the site's approved categories include what they want to sell?
  locationMatch: number;  // 0-25: How close is the centre to their target area?
  availability: number;   // 0-20: Is it available on their requested dates?
  priceMatch: number;     // 0-15: Does it fit their budget?
  sizeMatch: number;      // 0-10: Does the size meet their needs?
};
```

**Category match (0–30 points):**
- Site's approved categories include exact match: 30
- Site's approved categories include synonym: 25
- No categories configured (manual approval needed): 10
- Category explicitly not approved: 0

**Location match (0–25 points):**
- Centre is in the exact suburb/city: 25
- Centre is within 10km: 20
- Centre is in the same state: 10
- Any centre (no location specified): 25

**Availability (0–20 points):**
- Available on exact requested dates: 20
- Available within ±3 days: 15
- Available next week: 10
- No availability in next month: 0

**Price match (0–15 points):**
- Within budget: 15
- Up to 20% over budget: 10
- Over budget but under $500/day: 5
- Way over budget: 0

**Size match (0–10 points):**
- Exact size or larger: 10
- Within 80% of requested: 7
- Any size (no requirement): 10

### 3.2 Result presentation enhancements

Current results show a flat list. Enhance with:

**a) Search interpretation banner** — show users what the system understood:
```
🔍 Showing results for: Clothing pop-up in Brisbane
   Category: Clothing & Fashion | Area: Brisbane, QLD | Dates: Anytime
   [Edit filters]
```

**b) Group results by relevance tier:**
- **Best matches** (score 70+): Green highlight, "Recommended" badge
- **Good matches** (score 40-69): Normal display
- **Other options** (score < 40): Collapsed section, "Show more results"

**c) "Why this result?" tooltip** on each site explaining:
- ✅ Clothing is an approved category here
- ✅ This centre is in Brisbane CBD
- ⚠️ Only 2 of your 5 requested dates are available
- ✅ Price is within your budget

---

## Phase 4: Data Model Changes

### 4.1 New fields needed

**No schema changes required** — the existing tables already have everything needed:
- `sites.pricePerDay`, `sites.pricePerWeek`, `sites.weekendPricePerDay` — for budget filtering
- `shoppingCentres.latitude`, `shoppingCentres.longitude` — for proximity search
- `shoppingCentres.suburb`, `shoppingCentres.state`, `shoppingCentres.postcode` — for area matching
- `siteUsageCategories` — for category approval checking
- `bookings.startDate`, `bookings.endDate` — for availability checking

### 4.2 New tables (optional, for performance)

**`search_intent_cache`** — Cache LLM-parsed intents to avoid re-parsing:
```sql
CREATE TABLE search_intent_cache (
  id SERIAL PRIMARY KEY,
  queryHash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of normalized query
  parsedIntent JSONB NOT NULL,             -- The structured intent JSON
  createdAt TIMESTAMP DEFAULT NOW(),
  hitCount INTEGER DEFAULT 1
);
```

### 4.3 Enhanced search analytics

Add to existing `search_analytics` table:
```sql
ALTER TABLE search_analytics ADD COLUMN parsedIntent JSONB;
ALTER TABLE search_analytics ADD COLUMN parserUsed VARCHAR(20); -- 'rules' or 'llm'
ALTER TABLE search_analytics ADD COLUMN topResultScore INTEGER;
```

---

## Implementation Order

| Phase | What | Effort | Impact |
|-------|------|--------|--------|
| **1a** | Location index from database (auto-populated) | 1 day | High — Brisbane, Central Coast etc. work |
| **1b** | Budget/price filtering in parser | 0.5 day | Medium — "$200/day" queries work |
| **1c** | Better filler word removal | 0.5 day | Medium — conversational queries parse better |
| **2** | LLM intent parser with structured output | 2 days | High — all natural language works |
| **3a** | Scoring/ranking algorithm | 1 day | High — best results surface first |
| **3b** | Search interpretation banner UI | 1 day | Medium — users see what was understood |
| **3c** | Result grouping & "why this" | 1 day | Medium — clearer decision-making |
| **4** | Intent cache + analytics enhancement | 0.5 day | Low — cost savings + insights |

**Total: ~8 days of development**

---

## Example: End-to-End Flow

**User types:** "I want to promote a pop-up clothing store in Brisbane"

**Step 1 — Rule-based parser attempts extraction:**
```json
{
  "centreName": "",           // ❌ Couldn't match "brisbane" to a centre
  "productCategory": "clothing", // ✅ Found
  "assetType": "casual",     // ✅ Found (from "pop-up")
  "stateFilter": "QLD"       // ✅ Inferred from "Brisbane"
}
```

**Step 2 — Location empty → invoke LLM:**
```json
{
  "productCategory": "clothing",
  "activityType": "pop-up shop",
  "location": { "areaName": "Brisbane", "state": "QLD" },
  "assetType": "casual_leasing"
}
```

**Step 3 — Search engine:**
1. Find all centres in QLD where `city = 'Brisbane'` or within 15km of Brisbane CBD
2. Get their sites with `usageCategory` matching "clothing" or synonyms
3. Check availability for the next 2 weeks
4. Score and rank results

**Step 4 — Present results:**
```
🔍 Showing: Clothing pop-up spaces in Brisbane, QLD

⭐ Best Matches (3)
├── Site 4 at Chermside Shopping Centre — $120/day — Available now
├── Site 2 at Garden City — $150/day — Available from March 3
└── Site 7 at Indooroopilly — $95/day — Available now

📋 Other Options (2)
├── Site 1 at Pacific Fair (Gold Coast) — 70km away — $180/day
└── Site 3 at Toowoomba Plaza — 130km away — $80/day
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM adds latency (1-2s) | Show spinner with "Understanding your search...", cache results |
| LLM costs at scale | Cache aggressively, rule-based handles 70% of queries |
| LLM returns wrong intent | Always show "Did you mean?" with edit option, log for improvement |
| Brisbane has no centres yet | Show "No centres in Brisbane yet — here are nearby options" with distance |
| Ambiguous queries | Ask clarifying question: "Did you mean clothing as a product or fashion show?" |

---

## Business Decisions (Confirmed)

1. **Default dates:** When no date is entered, default to **current week**.
2. **Nearby radius:** Maximum distance for "nearby" results is **20km**.
3. **Free categories:** Free Charity and free Government sites are **excluded from default results**.
4. **Price display:** Show **actual prices** on results.
5. **LLM model:** Use **Gemini 2.5 Flash** (already configured via Forge API).
