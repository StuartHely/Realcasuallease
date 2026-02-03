# Real Casual Leasing - Known Risks & Constraints

**Version:** 2.0  
**Last Updated:** February 3, 2025  
**Author:** Manus AI

---

## Overview

This document catalogs known technical risks, operational constraints, and areas requiring attention for the Real Casual Leasing platform. Items are categorized by severity and domain.

---

## Critical Risks

### 1. Payment Integration Not Complete

| Aspect | Status |
|--------|--------|
| **Risk Level** | Critical |
| **Domain** | Financial |
| **Current State** | Stripe integration not active |
| **Impact** | Cannot process real payments; bookings require manual payment handling |
| **Mitigation** | Use `webdev_add_feature` with `feature="stripe"` to enable payment processing |

The platform currently supports invoice-based payments only. Stripe integration is scaffolded but not activated. All confirmed bookings require manual payment reconciliation until Stripe is enabled.

### 2. No Automated Refund Processing

| Aspect | Status |
|--------|--------|
| **Risk Level** | Critical |
| **Domain** | Financial |
| **Current State** | Cancellation creates reversal entries but no refund |
| **Impact** | Cancelled bookings require manual refund processing |
| **Mitigation** | Implement Stripe refund API integration when payment processing is enabled |

---

## High-Priority Risks

### 3. Email Delivery Reliability

| Aspect | Status |
|--------|--------|
| **Risk Level** | High |
| **Domain** | Communications |
| **Current State** | SMTP configured but no delivery tracking |
| **Impact** | Failed emails may go unnoticed; customers may miss confirmations |
| **Mitigation** | Implement email delivery status tracking; add retry logic for failed sends |

### 4. Single Point of Failure - Database

| Aspect | Status |
|--------|--------|
| **Risk Level** | High |
| **Domain** | Infrastructure |
| **Current State** | Single TiDB instance |
| **Impact** | Database outage causes complete platform unavailability |
| **Mitigation** | TiDB provides built-in replication; ensure backup strategy is tested |

### 5. Session Security

| Aspect | Status |
|--------|--------|
| **Risk Level** | High |
| **Domain** | Security |
| **Current State** | JWT-based sessions with configurable expiry |
| **Impact** | Long-lived sessions increase risk if token is compromised |
| **Mitigation** | Implement session rotation; add suspicious activity detection |

---

## Medium-Priority Risks

### 6. Booking Conflict Race Conditions

| Aspect | Status |
|--------|--------|
| **Risk Level** | Medium |
| **Domain** | Data Integrity |
| **Current State** | Availability check and booking creation are separate operations |
| **Impact** | Two users could book the same site for overlapping dates |
| **Mitigation** | Implement database-level locking or unique constraint on site+date combinations |

### 7. Large File Upload Handling

| Aspect | Status |
|--------|--------|
| **Risk Level** | Medium |
| **Domain** | Performance |
| **Current State** | Floor plan images uploaded directly to S3 |
| **Impact** | Large images may timeout or consume excessive bandwidth |
| **Mitigation** | Implement client-side image compression; add progress indicators |

### 8. Search Performance at Scale

| Aspect | Status |
|--------|--------|
| **Risk Level** | Medium |
| **Domain** | Performance |
| **Current State** | Full-text search uses LIKE queries with fuzzy matching |
| **Impact** | Performance may degrade with 1000+ centres |
| **Mitigation** | Consider dedicated search index (Elasticsearch/Meilisearch) for production scale |

---

## Operational Constraints

### Platform Limitations

| Constraint | Description | Workaround |
|------------|-------------|------------|
| **No WebSocket support** | Real-time updates not implemented | Polling-based refresh (manual or timed) |
| **Single timezone display** | All dates shown in user's local timezone | UTC storage ensures consistency |
| **No bulk booking** | Each booking must be created individually | Admin can create bookings on behalf of customers |
| **No recurring bookings** | Weekly/monthly recurring not supported | Manual creation of each booking period |

### Business Rule Constraints

| Constraint | Description | Rationale |
|------------|-------------|-----------|
| **Minimum 1-day booking** | Cannot book partial days | Simplifies pricing and availability logic |
| **7-day cancellation policy** | Hardcoded in booking flow | Business requirement; should be configurable |
| **GST rate fixed at 10%** | Stored per transaction but not configurable | Australian GST rate; change requires code update |
| **Invoice payment approval** | Only pre-approved customers can pay by invoice | Reduces credit risk |

### Technical Debt

| Area | Description | Priority |
|------|-------------|----------|
| **CentreDetail.tsx duplicate import** | useState imported twice causing build warning | Low - cosmetic |
| **Large routers.ts file** | Single file exceeds 3000 lines | Medium - maintainability |
| **Inconsistent error handling** | Some procedures throw, others return error objects | Medium - developer experience |
| **Missing unit tests** | Many procedures lack test coverage | High - reliability |

---

## Security Considerations

### Current Protections

| Protection | Implementation |
|------------|----------------|
| **Authentication** | Manus OAuth with session cookies |
| **Authorization** | Role-based access control at procedure level |
| **Input Validation** | Zod schemas on all tRPC inputs |
| **SQL Injection** | Drizzle ORM parameterized queries |
| **XSS Prevention** | React's default escaping; dangerouslySetInnerHTML used sparingly |

### Known Gaps

| Gap | Risk | Recommendation |
|-----|------|----------------|
| **No rate limiting** | API abuse possible | Implement request throttling |
| **No CAPTCHA** | Bot submissions possible | Add CAPTCHA to public forms |
| **No IP blocking** | Cannot block malicious actors | Implement IP-based access control |
| **Audit log gaps** | Not all admin actions logged | Expand audit coverage |

---

## Compliance Considerations

### Data Privacy

The platform collects personal information including names, email addresses, phone numbers, and business details. Current compliance status:

| Requirement | Status |
|-------------|--------|
| **Privacy Policy** | Not implemented - required before production |
| **Data export** | Not implemented - GDPR requirement |
| **Data deletion** | Soft delete only - may not satisfy "right to erasure" |
| **Consent tracking** | Not implemented |

### Financial Compliance

| Requirement | Status |
|-------------|--------|
| **GST reporting** | Transaction records include GST amounts |
| **Invoice generation** | Basic implementation exists |
| **Audit trail** | Booking status history tracked |
| **7-year retention** | Database retention policy needed |

---

## Monitoring Gaps

| Area | Current State | Recommendation |
|------|---------------|----------------|
| **Uptime monitoring** | None | Implement external health checks |
| **Error alerting** | Console logs only | Add error notification service |
| **Performance metrics** | None | Implement APM solution |
| **Business metrics** | Basic analytics tables | Build dashboard for key KPIs |

---

## Recommended Immediate Actions

1. **Enable Stripe integration** to process real payments
2. **Add rate limiting** to prevent API abuse
3. **Implement email delivery tracking** to ensure customer communications
4. **Fix CentreDetail.tsx duplicate import** to clear build warnings
5. **Add unit tests** for critical booking and payment flows

---

## Risk Register Summary

| ID | Risk | Severity | Likelihood | Status |
|----|------|----------|------------|--------|
| R1 | Payment processing unavailable | Critical | Certain | Open |
| R2 | No automated refunds | Critical | Certain | Open |
| R3 | Email delivery failures undetected | High | Possible | Open |
| R4 | Database single point of failure | High | Unlikely | Mitigated |
| R5 | Session token compromise | High | Unlikely | Open |
| R6 | Booking race conditions | Medium | Possible | Open |
| R7 | Large file upload timeouts | Medium | Possible | Open |
| R8 | Search performance degradation | Medium | Unlikely | Open |
