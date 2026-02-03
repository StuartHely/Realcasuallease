# Real Casual Leasing - Database & Data Flow

**Version:** 2.0  
**Last Updated:** February 3, 2025  
**Author:** Manus AI

---

## Database Overview

The platform uses a MySQL/TiDB relational database with Drizzle ORM for type-safe schema management. The schema consists of 24 tables organized into logical domains: Users & Authentication, Property Management, Booking Operations, and Financial Tracking.

---

## Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   owners    │────<│ shopping_centres │>────│  floor_levels   │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │                        │
                            │                        │
              ┌─────────────┼─────────────┐          │
              ▼             ▼             ▼          ▼
        ┌──────────┐  ┌─────────────┐  ┌────────────────────┐
        │  sites   │  │vacant_shops │  │ third_line_income  │
        └──────────┘  └─────────────┘  └────────────────────┘
              │             │                    │
              ▼             ▼                    ▼
        ┌──────────┐  ┌─────────────────────┐  ┌────────────────────┐
        │ bookings │  │ vacant_shop_bookings│  │ third_line_bookings│
        └──────────┘  └─────────────────────┘  └────────────────────┘
              │
              ▼
        ┌──────────────┐
        │ transactions │
        └──────────────┘
```

---

## Core Tables

### Users & Authentication

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | All platform users | openId, role, assignedState, canPayByInvoice |
| `customer_profiles` | Extended customer details | firstName, lastName, companyName, abn, insurance details |

The `users` table supports eight distinct roles with hierarchical permissions. The `assignedState` field restricts state-scoped admins to their designated territory.

### Property Management

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `owners` | Shopping centre owners/groups | bankDetails, commissionPercentage, remittanceType |
| `shopping_centres` | Physical locations | ownerId, state, latitude/longitude, mapImageUrl |
| `floor_levels` | Multi-level support | centreId, levelName, mapImageUrl, displayOrder |
| `sites` | Casual leasing spaces | centreId, floorLevelId, mapMarkerX/Y, pricing |
| `vacant_shops` | Short-term retail tenancies | centreId, totalSizeM2, pricePerWeek/Month |
| `third_line_income` | Non-tenancy assets | centreId, categoryId, pricePerWeek/Month |
| `third_line_categories` | Asset type classification | name, displayOrder, isActive |

### Booking Operations

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bookings` | Casual leasing reservations | siteId, customerId, startDate, endDate, status |
| `vacant_shop_bookings` | Vacant shop reservations | vacantShopId, customerId, dates, status |
| `third_line_bookings` | Third line asset reservations | thirdLineIncomeId, customerId, dates, status |
| `booking_status_history` | Audit trail for status changes | bookingId, previousStatus, newStatus, changedBy |
| `usage_categories` | 34 predefined booking categories | name, isFree, displayOrder |
| `site_usage_categories` | Junction: approved categories per site | siteId, categoryId |

### Financial Tracking

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `transactions` | Financial ledger entries | bookingId, ownerId, type, amounts, remitted |
| `budgets` | Site-level monthly targets | siteId, month, year, budgetAmount |
| `centre_budgets` | Centre-level annual budgets | centreId, financialYear, annualBudget |
| `fy_percentages` | Monthly distribution weights | financialYear, july-june percentages |
| `seasonal_rates` | Date-based pricing overrides | siteId, startDate, endDate, rates |

### Analytics & Audit

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `search_analytics` | Search query tracking | query, resultsCount, hadResults, searchDate |
| `image_analytics` | Image engagement metrics | siteId, imageSlot, viewCount, clickCount |
| `audit_log` | Admin action history | userId, action, entityType, entityId, changes |
| `system_config` | Platform configuration | key, value, imageQuality settings |

---

## Data Flow Patterns

### 1. Search Flow

The search process transforms natural language queries into structured database queries:

```
User Query → AI Parser → Structured Params → Database Query → Results
    │                          │
    ▼                          ▼
"Eastgate ATM"     { centre: "Eastgate",
                     assetType: "third_line" }
```

The search procedure queries all three asset tables (sites, vacant_shops, third_line_income) and aggregates results by centre. Results include availability data computed by checking existing bookings against the requested date range.

### 2. Booking Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Availability │───>│   Booking    │───>│   Payment    │
│    Check     │    │   Creation   │    │  Processing  │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Query bookings     Insert booking      Create transaction
  for date range     status: pending     Update booking.paidAt
                           │
                           ▼
                     ┌──────────────┐
                     │   Approval   │
                     │   (if req'd) │
                     └──────────────┘
```

Bookings transition through states: `pending` → `confirmed` → `completed` (or `cancelled`/`rejected`). Each transition is recorded in `booking_status_history` with the actor and timestamp.

### 3. Financial Flow

Revenue flows from customer payment to owner remittance:

```
Customer Payment
       │
       ▼
┌──────────────────────────────────────────────┐
│            Total Amount (inc GST)            │
├──────────────────────────────────────────────┤
│  GST Amount  │  Owner Amount  │ Platform Fee │
│    (10%)     │  (configurable)│  (remainder) │
└──────────────────────────────────────────────┘
       │
       ▼
Transaction Record (remitted: false)
       │
       ▼
Owner Remittance (per_booking or monthly)
       │
       ▼
Transaction Record (remitted: true, remittedAt: timestamp)
```

---

## Key Indexes

Performance-critical queries are optimized with composite indexes:

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `bookings` | siteId_date_range_idx | siteId, startDate, endDate | Availability queries |
| `bookings` | status_idx | status | Status filtering |
| `sites` | centreId_idx | centreId | Centre-based lookups |
| `search_analytics` | searchDate_idx | searchDate | Time-based analytics |
| `audit_log` | createdAt_idx | createdAt | Chronological audit |

---

## Data Types & Conventions

### Monetary Values

All monetary amounts use `decimal(12,2)` for precision. GST percentage is stored at transaction time using `decimal(5,2)` to preserve the rate applicable when the booking was made.

### Timestamps

All timestamps are stored in UTC using MySQL's `timestamp` type. The frontend converts to local timezone for display. The `updatedAt` columns use `onUpdateNow()` for automatic tracking.

### Map Coordinates

Site marker positions use `decimal(5,2)` for X and Y coordinates, representing percentages (0.00-100.00) relative to the floor plan image dimensions.

### Soft Deletes

Most entities use `isActive` boolean flags rather than hard deletes to preserve referential integrity and historical data. The `isHidden` flag on `floor_levels` serves the same purpose.

---

## Migration Strategy

Schema changes are managed through Drizzle Kit:

```bash
# Generate migration from schema changes
pnpm db:push

# This runs: drizzle-kit generate && drizzle-kit migrate
```

The migration process is additive-only in production. Column removals or type changes require careful planning to avoid data loss.

---

## Backup & Recovery

| Aspect | Strategy |
|--------|----------|
| Database | TiDB managed backups (point-in-time recovery) |
| File Storage | S3 versioning enabled |
| Configuration | Environment variables in secure vault |

---

## Data Retention

| Data Type | Retention Period | Rationale |
|-----------|------------------|-----------|
| Bookings | Indefinite | Financial audit requirements |
| Transactions | 7 years | Tax compliance |
| Audit Logs | 2 years | Operational review |
| Search Analytics | 1 year | Trend analysis |
| Image Analytics | 1 year | Engagement metrics |
