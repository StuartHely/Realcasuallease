# Casual Lease Platform - System Documentation

**Last Updated:** January 29, 2026  
**Version:** 27b4b093

---

## A. System Overview

### Purpose

Casual Lease is an **AI-driven short-term retail leasing platform** that connects shopping centre owners with businesses seeking temporary retail spaces. The platform manages three distinct asset types:

1. **Casual Leasing (CL)** - Traditional pop-up spaces with tables/chairs in common areas
2. **Vacant Shops (VS)** - Short-term physical retail tenancies in empty shop units
3. **Third Line Income (3LI)** - Non-tenancy assets like ATMs, vending machines, digital signage, car spaces

### Core Entities

| Entity | Description |
|--------|-------------|
| **Users** | Customers (tenants), centre managers, regional admins, state admins, mega admins |
| **Owners** | Shopping centre owner companies with bank details and fee configurations |
| **Shopping Centres** | Physical retail locations with addresses, maps, and contact details |
| **Floor Levels** | Multi-level support for centres with multiple floors |
| **Sites** | Individual bookable spaces within centres (CL assets) |
| **Vacant Shops** | Empty retail units available for short-term lease |
| **Third Line Income** | Non-tenancy revenue assets (ATMs, signage, etc.) |
| **Bookings** | Reservations linking customers to assets for date ranges |
| **Transactions** | Financial records for payments, commissions, and remittances |
| **Booking Status History** | Audit trail of all booking status changes with timestamps |

### Main Workflows

1. **Public Search & Booking Flow**
   - User searches by centre name, location, or asset type using natural language
   - AI-powered query parser extracts intent (centre, dates, size, category)
   - Prepositions (at, in, on, for, near) are automatically ignored in category searches
   - Word-by-word matching enables flexible location queries (e.g., "charity at bondi")
   - Results show availability calendar heatmap and interactive floor plan maps
   - User selects dates, provides business details, and confirms booking
   - System sends confirmation email and invoice

2. **Admin Booking Flow**
   - Admin selects centre, views site availability grid (Excel-style)
   - Clicks to select date range, chooses customer from dropdown
   - Sets furniture requirements, can override pricing
   - **Edit Booking Dialog** allows modifying existing bookings with:
     - Date picker fields for start/end date changes
     - Auto-recalculate pricing when dates change (shows breakdown)
     - Manual price override capability
   - Invoice override checkbox for Stripe users paying by invoice
   - Confirmation triggers email/invoice to customer

3. **Approval Workflow**
   - Certain bookings require manual approval (custom usage categories)
   - Centre managers review pending bookings in Booking Approvals dashboard
   - Approve/reject with optional reason; customer notified via email
   - **Rejected bookings** display with black "R" icon in Paid column
   - Rejected bookings only appear in Rejected and All Bookings tabs

4. **Financial Workflow**
   - Bookings calculate: total amount, GST, owner amount, platform fee
   - Transactions recorded for audit trail
   - Remittance options: per-booking or month-end batch
   - Weekly reports sent to configured email addresses

### Architectural Assumptions

- **Single Database**: MySQL/TiDB for all data (no microservices)
- **Monolithic Backend**: Express + tRPC with all procedures in one router
- **Session-based Auth**: Manus OAuth with JWT cookies
- **S3 Storage**: All images/documents stored in S3 via CloudFront
- **Server-side Rendering**: Vite + React with SSR support
- **Australian Focus**: GST calculations, AU timezone defaults, state-based filtering

---

## B. Database & Data Flow

### Database

**Type:** MySQL/TiDB (managed)  
**ORM:** Drizzle ORM with type-safe schema  
**Connection:** Via `DATABASE_URL` environment variable

### Key Tables (23 total)

#### Core Entities
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | All platform users with roles | Referenced by bookings, audit_log |
| `customer_profiles` | Extended customer details (ABN, insurance, trading name) | FK to users |
| `owners` | Shopping centre owner companies | Referenced by centres |
| `shopping_centres` | Physical retail locations | FK to owners, has many sites |
| `floor_levels` | Multi-level floor support | FK to centres |
| `sites` | Casual leasing spaces | FK to centres, floor_levels |
| `vacant_shops` | Empty retail units | FK to centres, floor_levels |
| `third_line_income` | Non-tenancy assets | FK to centres, third_line_categories |

#### Booking & Financial
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `bookings` | CL site reservations | FK to sites, users |
| `booking_status_history` | Audit trail of status changes | FK to bookings, users |
| `vacant_shop_bookings` | VS reservations | FK to vacant_shops, users |
| `third_line_bookings` | 3LI reservations | FK to third_line_income, users |
| `transactions` | Financial records | FK to bookings, owners |

#### Configuration & Reference
| Table | Purpose |
|-------|---------|
| `usage_categories` | 34 predefined booking categories |
| `site_usage_categories` | Many-to-many: sites to permitted categories |
| `usage_types` | Legacy usage types (backward compat) |
| `third_line_categories` | Categories for 3LI assets |
| `seasonal_rates` | Date-specific pricing overrides |
| `budgets` | Site-level monthly revenue targets |
| `centre_budgets` | Centre-level annual budgets |
| `fy_percentages` | Financial year monthly distribution |
| `system_config` | Platform-wide settings |

#### Analytics & Audit
| Table | Purpose |
|-------|---------|
| `audit_log` | Admin action tracking |
| `search_analytics` | Search query tracking |
| `image_analytics` | Image view/click tracking |

### Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   tRPC      │────▶│   Drizzle   │
│   (React)   │◀────│   Router    │◀────│   (MySQL)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   ▼                   │
       │            ┌─────────────┐            │
       │            │   S3/CDN    │            │
       │            │  (Images)   │            │
       │            └─────────────┘            │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Email     │     │   Invoice   │     │   Audit     │
│   Service   │     │  Generator  │     │    Log      │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Key Data Flows

1. **Search Flow**: Query → queryParser (preposition removal, word-by-word matching) → smartSearch → centres/sites/VS/3LI → category filtering → availability check → results
2. **Booking Flow**: Selection → validation → overlap check → booking creation → status history entry → transaction → email
3. **Admin Edit Flow**: Load booking → Edit dialog with date pickers → calculatePrice endpoint → save changes → status history update → audit log
4. **Image Flow**: Upload → sharp resize → S3 put → CDN URL → database update

---

## C. Key Design Decisions

### 1. Three Asset Types in One Platform

**Decision:** Support CL, VS, and 3LI as separate but unified asset types  
**Trade-off:** Increased schema complexity vs. single platform for all retail leasing  
**Impact:** Separate booking tables per asset type, unified search across all

### 2. Role-Based Access Control (8 Levels)

**Decision:** Hierarchical roles from customer to mega_admin  
**Roles:**
- `customer` - End users booking spaces
- `owner_centre_manager` - Single centre management
- `owner_marketing_manager` - Marketing-focused access
- `owner_regional_admin` - Multiple centres in region
- `owner_state_admin` - State-wide access
- `owner_super_admin` - Full owner organization access
- `mega_state_admin` - Platform state admin
- `mega_admin` - Full platform access

**Trade-off:** Complex permission logic vs. granular access control

### 3. Percentage-Based Map Coordinates

**Decision:** Store marker positions as 0-100% instead of pixels  
**Trade-off:** Requires coordinate conversion vs. responsive across screen sizes  
**Impact:** Maps work on any device without recalculation

### 4. GST Stored at Transaction Time

**Decision:** Store GST percentage with each booking/transaction  
**Trade-off:** Data duplication vs. accurate historical records if GST changes

### 5. Soft Delete for Floor Levels

**Decision:** `isHidden` flag instead of hard delete  
**Trade-off:** Data accumulation vs. preserving historical booking references

### 6. Natural Language Search with Preposition Handling

**Decision:** AI-powered query parsing with automatic preposition removal  
**Implementation:** Common prepositions (at, in, on, for, near, by, from, to, the, a, an) are filtered out  
**Trade-off:** Processing overhead vs. user-friendly queries like "charity at bondi"

### 7. Category Synonym Mapping

**Decision:** Expand category keywords to include common variations  
**Example:** "charity" → ["charity", "charities", "non-profit", "nonprofit", "fundraising", "community"]  
**Trade-off:** Maintenance of synonym lists vs. flexible category matching

### 8. Invoice vs. Stripe Payment

**Decision:** Per-user payment method with per-booking override  
**Trade-off:** Complexity in payment flow vs. flexibility for enterprise customers

### 9. Booking Status History

**Decision:** Comprehensive audit trail for all booking status changes  
**Implementation:** `booking_status_history` table with user, timestamp, old/new status, reason  
**Trade-off:** Storage growth vs. full accountability and debugging capability

### 10. Rejected Booking Display

**Decision:** Rejected bookings show "R" icon instead of paid status  
**Implementation:** Black "R" icon in Paid column, only visible in Rejected/All Bookings tabs  
**Trade-off:** Special case handling vs. clear visual distinction

---

## D. Known Risks & Constraints

### High-Risk Areas

#### 1. Booking Overlap Prevention
**Risk:** Race conditions in concurrent bookings  
**Location:** `server/db.ts` - `checkSiteAvailability()`  
**Mitigation:** Database-level unique constraints, optimistic locking  
**Fragility:** No distributed locking; relies on transaction isolation

#### 2. Date/Timezone Handling
**Risk:** Inconsistent date comparisons across timezones  
**Location:** Throughout booking and search logic  
**Mitigation:** Store as UTC timestamps, convert on display  
**Fragility:** Some date comparisons use `startOfDay()` which is timezone-sensitive

#### 3. Large Router File
**Risk:** `server/routers.ts` is 3500+ lines  
**Impact:** Difficult to navigate, merge conflicts likely  
**Recommendation:** Split into feature-based router files

#### 4. Image Processing Memory
**Risk:** Large image uploads may exhaust memory  
**Location:** `server/imageProcessing.ts`  
**Mitigation:** Sharp library with streaming, but no hard limits enforced

#### 5. Search Performance
**Risk:** Complex search queries on large datasets  
**Location:** `server/dbOptimized.ts` - `smartSearch()`  
**Mitigation:** Composite indexes, but no caching layer

#### 6. Category Synonym Maintenance
**Risk:** New categories may not have synonym mappings  
**Location:** `shared/categorySynonyms.ts`  
**Mitigation:** Fuzzy matching as fallback, but requires manual updates for new synonyms

### Constraints

| Constraint | Impact |
|------------|--------|
| No Stripe integration yet | All payments are invoice-based |
| No WebSocket/real-time | Polling required for live updates |
| Single region deployment | Latency for non-AU users |
| No rate limiting | Vulnerable to abuse |
| No background job queue | Email/reports run synchronously |

### Technical Debt

1. **Legacy `usageTypes` table** - Kept for backward compatibility, should migrate to `usageCategories`
2. **Duplicate booking tables** - Three separate tables (bookings, vacant_shop_bookings, third_line_bookings) with similar schemas
3. **Hardcoded email templates** - Should be admin-configurable
4. **No test coverage for UI** - Only backend tests exist (100+ vitest tests)
5. **Incomplete category synonym coverage** - Some categories lack comprehensive synonym mappings

---

## E. Roadmap State

### Completed Features (as of Jan 29, 2026)

- ✅ Core booking system for all three asset types
- ✅ Natural language search with AI query parsing
- ✅ Preposition handling in category searches (at, in, on, etc.)
- ✅ Word-by-word matching for flexible location queries
- ✅ Category synonym expansion (charity/charities, food/f&b, etc.)
- ✅ Interactive floor plan maps with marker placement
- ✅ Multi-level floor support
- ✅ Admin booking creation with availability grid
- ✅ Admin booking edit with date pickers and auto-price recalculation
- ✅ Booking edit and cancellation (with audit logging)
- ✅ Booking status history timeline
- ✅ Rejected booking display with "R" icon
- ✅ Email notifications (confirmation, reminders)
- ✅ Invoice generation (PDF)
- ✅ Usage category management (34 categories)
- ✅ Site-to-category permission mapping
- ✅ Seasonal pricing
- ✅ Budget tracking (site and centre level)
- ✅ Image upload with auto-resize
- ✅ Search analytics tracking
- ✅ Weekly report scheduling
- ✅ Trading name field for users

### In Progress / Implied

Based on todo.md and code comments:

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe payment integration | Not started | Schema ready, no implementation |
| Payment splitting | Not started | Owner/platform fee fields exist |
| Nearby centres (10km radius) | Partial | `geoUtils.ts` exists, UI not integrated |
| Embeddable widget | Not started | Mentioned in Phase 7 |
| AI assistant "Aria" | Not started | Mentioned in Phase 8 |
| Review/rating system | Not started | Mentioned in Phase 9 |
| Mobile app | Not started | Web-only currently |

### Recent Work (Jan 27-29, 2026)

1. **Rejected Booking Display** - Black "R" icon in Paid column, proper tab filtering
2. **Booking Edit Enhancement** - Date pickers with auto-price recalculation
3. **Search Behavior Fix** - Status tabs now clear search filter
4. **Edit Button Fix** - Properly loads booking details when editing from Booking Management
5. **Category Search Fix** - Preposition removal and word-by-word matching for "charity at bondi" queries
6. **Booking Status History** - Full audit trail with timeline display
7. **Trading Name Field** - Added to user registration and edit forms

### Recommended Next Steps

1. **Stripe Integration** - Enable actual payment processing
2. **Split Router File** - Break `routers.ts` into feature modules
3. **Add Caching Layer** - Redis for search results and availability
4. **Background Job Queue** - Bull/BullMQ for emails and reports
5. **UI Test Coverage** - Playwright or Cypress for critical flows
6. **Expand Category Synonyms** - Add more common variations for all categories

---

## File Structure Reference

```
casuallease/
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (auth, theme)
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # tRPC client, utilities
│   │   └── pages/          # Route components
│   │       └── admin/      # Admin dashboard pages (25+)
│   └── public/             # Static assets
├── drizzle/
│   └── schema.ts           # Database schema (650+ lines)
├── server/
│   ├── _core/              # Framework plumbing (auth, email, etc.)
│   ├── routers.ts          # tRPC procedures (3500+ lines)
│   ├── db.ts               # Database helpers
│   ├── *Db.ts              # Feature-specific DB modules
│   └── *.test.ts           # Vitest test files (100+)
├── shared/
│   ├── queryParser.ts      # Search query parsing logic
│   ├── categorySynonyms.ts # Category keyword expansion
│   └── stringSimilarity.ts # Fuzzy matching utilities
└── storage/
    └── index.ts            # S3 helpers
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session cookie signing |
| `VITE_APP_ID` | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend |
| `BUILT_IN_FORGE_API_*` | Manus platform APIs |
| `SMTP_*` | Email service configuration |

---

*This document should be updated when significant architectural changes are made.*
