# Real Casual Leasing - System Overview

**Version:** 2.0  
**Last Updated:** February 3, 2025  
**Author:** Manus AI

---

## Executive Summary

Real Casual Leasing is an AI-driven short-term retail leasing platform that connects shopping centre owners with casual tenants seeking temporary retail spaces. The platform manages three distinct asset types: **Casual Leasing** (pop-up stalls and kiosks), **Vacant Shops** (short-term physical retail tenancies), and **Third Line Income** (non-tenancy assets like ATMs, vending machines, and digital signage).

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript | Single-page application with responsive design |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Component library and utility-first styling |
| **Backend** | Express 4 + tRPC 11 | Type-safe API layer with end-to-end type inference |
| **Database** | MySQL/TiDB | Relational database with Drizzle ORM |
| **Authentication** | Manus OAuth | SSO with session-based authentication |
| **File Storage** | AWS S3 | Floor plan images, site photos, and documents |
| **AI Integration** | LLM API | Natural language search processing |

---

## Core Modules

### 1. Public Website

The customer-facing interface provides natural language search capabilities, allowing users to find available retail spaces by centre name, location, date, or product category. Key features include:

- **AI-Powered Search:** Parses queries like "15-20sqm fashion at Eastgate from next week" into structured search parameters
- **State-Based Browsing:** Filter centres by Australian state (NSW, VIC, QLD, SA, WA, TAS)
- **Interactive Floor Plans:** Visual map markers showing site locations with hover tooltips
- **Calendar Heatmap:** Two-week availability view with color-coded booking status
- **Multi-Asset Type Filtering:** Toggle between Casual Leasing, Vacant Shops, Third Line Income, or All Assets

### 2. Booking System

The booking engine handles the complete lifecycle from inquiry to completion:

- **Instant Booking:** Pre-approved sites can be booked immediately
- **Approval Workflow:** Custom usage categories trigger manual review
- **Payment Processing:** Stripe integration with invoice option for approved customers
- **Status Tracking:** Pending → Confirmed → Completed (or Cancelled/Rejected)
- **Audit Trail:** Complete history of status changes with timestamps and actors

### 3. Admin Dashboard

Role-based administration with eight distinct permission levels:

| Role | Scope | Capabilities |
|------|-------|--------------|
| **mega_admin** | Platform-wide | Full system access, all centres and owners |
| **mega_state_admin** | Assigned state | All centres within assigned state |
| **owner_super_admin** | Owner portfolio | All centres for assigned owner |
| **owner_state_admin** | Owner + State | Owner's centres in assigned state |
| **owner_regional_admin** | Regional | Subset of owner's centres |
| **owner_marketing_manager** | Marketing | Reports and analytics only |
| **owner_centre_manager** | Single centre | Assigned centre management |
| **customer** | Self-service | Own bookings and profile |

### 4. Financial Management

The platform handles complex financial flows including:

- **Commission Calculation:** Configurable percentage per owner
- **GST Tracking:** Stored at transaction time for audit compliance
- **Owner Remittance:** Per-booking or monthly settlement options
- **Platform Fees:** Automatic deduction from booking revenue
- **Budget Tracking:** Annual budgets with monthly percentage distribution

---

## Integration Points

### External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Manus OAuth | User authentication | Active |
| AWS S3 | File storage | Active |
| Stripe | Payment processing | Not integrated |
| SMTP | Email notifications | Active |
| LLM API | AI search processing | Active |

### Scheduled Tasks

The platform runs automated background processes:

- **Payment Reminders:** Daily check for overdue invoice payments
- **Weekly Reports:** Friday 3pm booking summaries to centre managers
- **Booking Completion:** Auto-complete bookings after end date

---

## Deployment Architecture

The application runs as a single Node.js process serving both the API and static frontend assets. The architecture supports horizontal scaling through stateless design:

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Node.js │   │  Node.js │   │  Node.js │
        │  Server  │   │  Server  │   │  Server  │
        └──────────┘   └──────────┘   └──────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │   MySQL/TiDB     │
                    │    Database      │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │     AWS S3       │
                    │  (File Storage)  │
                    └──────────────────┘
```

---

## Security Model

### Authentication

All authenticated routes require a valid session cookie issued by Manus OAuth. The session contains the user's `openId`, which maps to the internal user record.

### Authorization

Role-based access control (RBAC) is enforced at the tRPC procedure level. Protected procedures validate the user's role and scope before executing business logic. State-scoped roles (e.g., `mega_state_admin`) are further restricted to their assigned state.

### Data Protection

- Passwords are never stored (OAuth-only authentication)
- Sensitive financial data (bank accounts) is stored encrypted at rest
- All API traffic uses HTTPS
- CORS is configured to allow only trusted origins

---

## Performance Considerations

### Database Optimization

- Composite indexes on frequently queried columns (site + date range)
- Pagination on all list endpoints
- Query result caching for static data (centres, floor levels)

### Frontend Optimization

- Code splitting by route
- Lazy loading of images and floor plans
- Debounced search input (300ms)
- Optimistic UI updates for mutations

---

## Monitoring & Observability

| Metric | Collection Method |
|--------|-------------------|
| API response times | Server-side logging |
| Error rates | Console logging with stack traces |
| Search analytics | Dedicated `search_analytics` table |
| Image engagement | `imageAnalytics` table (views/clicks) |
| Audit trail | `audit_log` table for admin actions |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Feb 3, 2025 | Added Vacant Shops and Third Line Income asset types; multi-floor support; enhanced search |
| 1.0 | Dec 27, 2024 | Initial release with Casual Leasing only |
