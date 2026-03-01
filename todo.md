# Casual Lease Platform — Consolidated TODO
> Last consolidated: Mar 1, 2026

---

## ✅ Completed Phases (Summary)

### Phase 1: Database Schema & Core Structure
All done. Drizzle ORM schema with 25+ tables: users, owners, portfolios, shoppingCentres, sites, bookings, vacantShops, thirdLineIncome, transactions, auditLog, floorLevels, seasonalRates, budgets, centreBudgets, fyPercentages, searchAnalytics, searchIntentCache, usageCategories, siteUsageCategories, bookingStatusHistory, customerProfiles, passwordResetTokens, imageAnalytics, thirdLineCategories, systemConfig, faqs.

### Phase 2: Backend API Development
All core done. tRPC routers for all entities (17 sub-routers in server/routers/). Search API with fuzzy matching, query parsing (centre, size, tables, dates, categories, asset types, state filters). Booking creation with conflict prevention, approval workflow, auto-approval rules engine, Stripe checkout, invoice payment, recurring bookings. RBAC middleware (public → protected → owner → admin). Image upload via S3 Forge proxy.

### Phase 3: Main Frontend
All core done. Homepage with unified natural language search, autocomplete, state browsing. Centre detail pages with interactive floor plan maps, multi-asset type tabs, availability calendars. Site detail pages with image gallery, panorama viewer, price calculator. Booking flow with equipment validation, category selection, insurance checking. User dashboard (MyBookings) with analytics, rebook, recurring management. Registration with company details, insurance upload + OCR scanning.

### Phase 4: Admin Dashboard
All core done. AdminLayout with collapsible sidebar (Content, Operations, Financial, System sections). Shopping centre CRUD, site management with image upload/drag-drop/crop, floor plan management (multi-level, hide/unhide). Booking management with status tabs, search, Excel export. Admin booking creation page with calendar grid. Pending approvals with insurance scanning. User management, owner/manager management with centre assignment. Equipment management. Usage categories admin. Centre codes admin. Seasonal pricing admin with bulk increase. FY budget management. Search analytics dashboard. Portfolio dashboard with budget vs actual reporting.

### Phase 5: Payment Integration (Partial)
Done: Stripe Checkout sessions (CL, VS, TLI). Webhook handling → marks paid, creates transaction record, updates status to confirmed, records status history. Commission calculation at booking time (per-asset-type CL/VS/TLI rates with fallback). Invoice payment flow with due dates, reminders, admin "Record Payment" interface. Booking cancellation with reversal transaction entries (negative amounts) + Stripe refund + credit note numbers + customer notification — for all 3 asset types.
Each deployment is financially self-contained (own Stripe account); no Stripe Connect needed.

### Phase 6: Notifications (Partial)
Done: Email service via SMTP. Booking confirmation, rejection, approval, cancellation emails. Stripe approval email with payment link. Payment receipt emails. Payment reminder system (7, 14, 30 days). Weekly booking report (Friday 3pm, per-centre timezone, Excel format, public holiday override). Owner notification on new bookings. VS/TLI enquiry/confirmation/rejection emails.

### Phase 8: AI & Advanced Search
Done: AI Chat Assistant "Aria" (Bedrock LLM via Forge). Natural language search with queryParser.ts (centre names, sizes, tables, dates, categories, asset types, state filters). Fuzzy search with Levenshtein distance. Size match indicators. Nearby centres with Haversine distance + Google Maps. Australia overview map with marker clustering.

### Phase 9: Additional Features (Partial)
Done: Pricing analytics dashboard with AI-powered recommendations (suggestions only). Occupancy tracking. Revenue reporting. Recurring bookings (weekly/fortnightly/monthly, max 52, group cancel). Three asset types (CL, VS, TLI) with separate booking tables, admin pages, calendars. Per-asset-type commission rates. Auto-approval rules engine. Audit log viewer. Financial reports with filtering/pagination.

### Other Completed Work
- Per-asset-type commission rates (CL, VS, TLI) for owners with fallback
- Fixed processSiteImage to use S3 storagePut instead of local filesystem
- Image three-tier fallback (Direct CloudFront → Express Proxy → SVG Placeholder)
- Dual auth (JWT primary + OAuth fallback) with AuthGuard
- Password reset with tokens
- Google Places autocomplete for address fields
- Rich text editor for centre/site descriptions
- PDF upload/display for centres (up to 3)
- Weekend border highlighting on calendars
- Calendar date selection for booking from search results
- Trading name field throughout system
- Booking status history audit trail
- Natural sort for site numbers
- Floor level hide/unhide (soft delete)
- Centre payment mode (stripe / stripe_with_exceptions / invoice_only)
- Booking number format: {CENTRE_CODE}-{YYYYMMDD}-{SEQ}

---

## 🔴 High Priority — Remaining Work

### Domain Configuration
- [ ] Configure domain for realcasualleasing.com (via deployment platform Settings → Domains)

### SMTP Secrets
- [ ] Request SMTP secrets to appear in Settings → Secrets panel
- [ ] Verify secrets are visible and configurable

### Phase 10: Testing & Deployment
- [ ] Write comprehensive unit tests for all user roles and permissions
- [ ] Test booking conflict prevention end-to-end
- [ ] Test email/notification delivery end-to-end
- [ ] Security audit
- [ ] Performance optimization pass
- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] Final deployment preparation

---

## 🟡 Medium Priority — Features

### Search & Performance
- [ ] Implement search result caching with 5-min TTL
- [ ] Add pagination to search results (initial load: 30 sites)
- [ ] Add lazy loading for remaining sites on scroll

### Auto-Approval Rules Expansion
- [ ] Add allowedCategoryIds filter to auto-approval rules
- [ ] Add excludeCentreIds filter to auto-approval rules
- [ ] Build admin UI for configuring expanded auto-approval rules

### Enhanced Registration Form
- [ ] Add password and confirm password fields to registration
- [ ] Add company details section (name, website, ABN, address, city, state, postcode)
- [ ] Complete product/service dropdown with custom text field

### Payment & Financial
- [ ] Monthly maintenance fee tracking for owners
- [ ] Remittance options implementation (per booking / month end automated)
- [ ] Payment confirmation emails to all parties on invoice payment recording
- [ ] Export functionality for financial analytics reports

### Pricing Features
- [ ] Add real-time price preview calculator on site detail pages (component exists, needs integration)
- [ ] Build dynamic pricing recommendations dashboard with revenue impact projections
- [ ] Bulk rate update tool for admin
- [ ] Rate history tracking with audit log

### Budget Enhancements
- [ ] Per-site budget breakdown in drill-down modal (site name, budget, actual, variance)
- [ ] Color coding for over/under budget sites in breakdown
- [ ] Budget drill-down tests

---

## 🟡 Medium Priority — Bug Fixes

### Seasonal Pricing $0 on Calendar
- [ ] Fix bulk seasonal rate increase showing $0 on calendar
- [ ] Issue: Applied 30% increase shows $0; investigate seasonal pricing calculation logic
- [ ] Verify seasonal_pricing table data integrity after bulk create

### Search Results & Map Issues
- [ ] Fix "Show All Sized Sites" button navigation to properly remove category filters
- [ ] Fix centre map not showing on search results page (some centres)
- [ ] Add VS and 3rdL availability to search results calendar heatmap

### Floor Plan & Map Issues
- [ ] Fix missing floor plan map for some centres (Highlands, Chullora — need map images uploaded)
- [ ] Document map upload instructions for centres missing floor plans
- [ ] Add asset type markers to floor plan map editor

### Admin Page Fixes
- [ ] Fix "Failed to update a site, Failed query" error in Admin Sites page
- [ ] Fix CentreDetail tabs when accessing via state browse (investigate if still occurring)
- [ ] Add Search Analytics link to admin dashboard navigation
- [ ] Update Admin Bookings default tab tests

### S3 Image 403s
- [ ] Infrastructure issue: CloudFront/S3 bucket policy returning 403 for uploaded images
- [ ] Code-level proxy + placeholder fallback already in place — needs S3 bucket policy fix

---

## 🟢 Lower Priority — Future Features

### Phase 7: Embeddable Widget (DEFERRED)
Deferred due to Stripe/iframe security complexities related to Stripe redirects within iframes.
- [ ] Build embeddable iframe widget
- [ ] Create widget API endpoints
- [ ] Add CORS configuration for third-party domains

### Phase 8: Real-time Updates
- [ ] Implement WebSocket for real-time booking updates
- [ ] Add polling fallback (10-30 seconds)

### Phase 9: Additional Features
- [ ] Campaign management for agencies
- [ ] Build content/education section (blog)
- [ ] Add trust & safety features
- [ ] Implement profile verification
- [ ] Add review/rating system
- [ ] SMS notifications (optional)
- [ ] 360-degree image support (schema field exists, viewer component exists)

### VS/TLI Enhancements
- [ ] Create dedicated VacantShopDetail page with booking calendar
- [ ] Create dedicated ThirdLineDetail page with booking calendar
- [ ] Seed initial Third Line categories (ATM, Car Wash, etc.)
- [ ] Add VS/3rdL availability to search results calendar heatmap
- [ ] Verify VS/TLI status changes reflect in customer view

### Other Unchecked Items
- [ ] Store lat/lng coordinates for "near me" user searches (schema update needed)
- [ ] Test equipment tracking across multiple bookings
- [ ] Test insurance upload with PDF and image files end-to-end
- [ ] Fix insurance scanner to properly extract amount and expiry date from all document types
- [ ] Configure seasonal rate calendar view in admin for visual management (component created)
- [ ] Add email preferences to user profile
- [ ] Investigate and fix missing Highlands Marketplace floor plan

---

## 📝 Architecture Notes

- **Stack**: TypeScript, tRPC, Drizzle ORM (PostgreSQL), React (Radix UI/shadcn), Vite, wouter
- **Three asset types**: Casual Leasing (CL), Vacant Shops (VS), Third Line Income (TLI) — each has own bookings table and admin pages
- **Booking lifecycle**: Creation → (Pending/Auto-Approved) → Stripe Checkout or Invoice → Confirmed → Completed/Cancelled
- **Payment split**: Calculated at booking time (ownerAmount, platformFee). Transaction record created on payment. Reversal transaction on cancellation.
- **Commission**: "Override with fallback" — `owner.commissionCl ?? owner.commissionPercentage`
- **Image handling**: Three-tier fallback (Direct CloudFront → Express Proxy /api/image-proxy → SVG Placeholder /api/placeholder)
- **Auth**: Dual auth (JWT primary) with AuthGuard protecting routes
- **Search**: Natural language via queryParser.ts → centre names, sizes, dates, categories, asset types, state filters
- **Floor levels**: Multi-level shopping centres with hide/unhide (soft delete)
- **Each deployment is financially self-contained** — own Stripe account, no cross-instance money movement

## 🔧 Commands

```bash
pnpm dev              # Start dev server
pnpm run check        # TypeScript type check
pnpm test             # Run tests
pnpm build            # Production build
pnpm run db:push      # Generate and run migrations

# Git push
ssh-agent bash -c "ssh-add ~/.ssh/stuart_new && git push origin main"
```
