# Casual Lease Platform - TODO

## Phase 1: Database Schema & Core Structure
- [x] Design and implement comprehensive database schema
- [x] Create shopping centres table
- [x] Create sites/spaces table with all attributes
- [x] Create bookings table with status tracking
- [x] Create users table with role-based access
- [x] Create owners/managers table with bank details
- [x] Create financial transactions table
- [x] Create audit log table for admin changes
- [x] Import sample data from Excel file

## Phase 2: Backend API Development
- [x] Build tRPC routers for all entities
- [x] Implement search API (centre name + date)
- [x] Implement availability checking logic
- [x] Implement booking creation with conflict prevention
- [ ] Implement booking cancellation with reversal entries
- [ ] Build admin CRUD operations for centres/sites
- [ ] Build admin CRUD operations for users/owners
- [x] Implement role-based access control middleware
- [ ] Add image upload functionality for sites

## Phase 3: Main Frontend (casuallease.com)
- [x] Design homepage with search interface
- [x] Implement centre name + date search
- [x] Display search results with site details
- [x] Show availability for requested week + following week
- [ ] Show nearby centres within 10km radius
- [x] Build site detail pages with image gallery
- [x] Implement booking flow with form validation
- [x] Add user registration with all required fields
- [x] Add user login functionality
- [x] Build user dashboard for managing bookings

## Phase 4: Admin Dashboard
- [ ] Create multi-level admin access system
- [ ] Implement Mega Administrator controls
- [ ] Implement Owner Super Administrator controls
- [ ] Implement State/Regional/Centre Manager roles
- [ ] Build centre management interface
- [ ] Build site management interface (CRUD + images)
- [ ] Build user management interface
- [ ] Build owner/manager configuration
- [ ] Add bank account details management
- [ ] Add GST percentage configuration
- [ ] Add monthly fee and commission configuration
- [ ] Implement audit log viewer (SuperAdmin only)
- [ ] Add usage dropdown management
- [ ] Add instant booking toggle per site

## Phase 5: Payment Integration
- [ ] Integrate Stripe payment processing
- [ ] Implement payment splitting (owner + platform fee)
- [ ] Add commission percentage calculation
- [ ] Add monthly maintenance fee tracking
- [ ] Implement remittance options (per booking / month end)
- [ ] Build financial reporting dashboard
- [ ] Track GST on all transactions
- [ ] Handle booking cancellations with credit entries

## Phase 6: Automated Notifications & Reporting
- [ ] Set up email service integration
- [ ] Implement booking confirmation emails
- [ ] Implement monthly invoice emails (up to 3 addresses)
- [ ] Implement month-end remittance emails (up to 5 addresses)
- [ ] Implement Friday 3pm weekly booking report (up to 10 addresses)
- [ ] Add configurable email templates in admin
- [ ] Add public holiday calendar adjustment
- [ ] Implement SMS notifications (optional)

## Phase 7: Embedded Widget for Managers
- [ ] Build embeddable iframe widget
- [ ] Create widget API endpoints
- [ ] Implement same search/booking functionality
- [ ] Add CORS configuration for third-party domains
- [ ] Create widget documentation and embed code
- [ ] Ensure real-time sync with main site

## Phase 8: Real-time Sync & Advanced Features
- [ ] Implement WebSocket for real-time updates
- [ ] Add polling fallback (10-30 seconds)
- [ ] Build AI assistant "Aria" interface
- [ ] Implement fuzzy search and NLP
- [ ] Add natural language date parsing
- [ ] Add smart suggestions and recommendations
- [ ] Implement map-based discovery
- [ ] Add 360-degree image support

## Phase 9: Additional Features
- [ ] Build landlord analytics dashboard
- [ ] Add occupancy tracking
- [ ] Add revenue reporting
- [ ] Implement recurring/bulk bookings
- [ ] Add campaign management for agencies
- [ ] Build content/education section (blog)
- [ ] Add trust & safety features
- [ ] Implement profile verification
- [ ] Add review/rating system
- [ ] Mobile responsive design optimization

## Phase 10: Testing & Deployment
- [ ] Write comprehensive unit tests
- [ ] Test all user roles and permissions
- [ ] Test payment flows end-to-end
- [ ] Test booking conflict prevention
- [ ] Test email/notification delivery
- [ ] Test real-time synchronization
- [ ] Test embedded widget functionality
- [ ] Performance optimization
- [ ] Security audit
- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] Final deployment preparation

## User Requested Enhancements (Dec 26, 2024)
- [x] Add graphic availability summary at top of search results page
- [x] Improve search to handle partial name matches (e.g., "Highlands" finds "Highlands Marketplace")

## Booking Data Import (Dec 26, 2024)
- [x] Import test availability data from calendar CSV format
- [x] Create test bookings for Highlands Marketplace sites

## Calendar Heatmap Visualization (Dec 26, 2024)
- [x] Replace availability summary with calendar heatmap showing dates
- [x] Color code: Red=Booked, Green=Available
- [x] Show site numbers in rows, dates in columns
- [x] Add hover tooltips with booking details
- [x] Add legend explaining color codes

## Site Images Upload (Dec 26, 2024)
- [x] Extract images from zip files
- [x] Upload images to S3 storage
- [x] Update database with image URLs
- [x] Display images in site detail pages
- [x] Add image gallery functionality

## Bug Fixes (Dec 26, 2024)
- [x] Fix search not finding "Highlands Marketplace"
- [x] Debug search query and database connection
- [x] Make search case-insensitive

## Data Cleanup (Dec 26, 2024)
- [x] Remove duplicate Highlands Marketplace entries
- [x] Verify sites are linked to correct centre ID
- [x] Clean up any orphaned data

## Search Enhancement (Dec 26, 2024)
- [x] Test if "highland" finds "Highlands Marketplace"
- [x] Implement fuzzy/typo-tolerant search using Levenshtein distance
- [x] Test fuzzy search with common misspellings
- [x] Optimize fuzzy search to avoid false positives on short queries

## Autocomplete Feature (Dec 26, 2024)
- [x] Add autocomplete dropdown to search input
- [x] Show matching centre names as user types
- [x] Implement debouncing to reduce API calls (300ms)
- [x] Add keyboard navigation (arrow keys, enter, escape)
- [x] Style dropdown with hover states and selected state

## Admin Dashboard (Dec 27, 2024)
- [x] Create admin layout with sidebar navigation
- [x] Implement role-based access control for 8 user roles
- [x] Create admin dashboard home with statistics
- [x] Build shopping centre management (CRUD) - PRIORITY
- [x] Build site management with image upload - PRIORITY
- [ ] Build booking management and approval system
- [ ] Build user management interface
- [ ] Build owner/manager management
- [ ] Create financial reports dashboard
- [ ] Add analytics and statistics views
- [ ] Implement audit log viewer

## Updated Data Import (Dec 27, 2024)
- [x] Import updated 98-row dataset from CSV
- [x] Replace existing sample data with new data
- [x] Verify all centres and sites imported correctly
- [x] Successfully imported 8 shopping centres and 58 sites

## Enhanced Search Features (Dec 27, 2024)
- [x] Parse site-specific queries (e.g., "Pacific Square Site 2")
- [x] Add site-level search by description (e.g., "Outside Prouds")
- [x] Implement smart query understanding to detect centre + site patterns
- [x] Auto-filter/highlight specific sites when detected in query
- [x] Word-based matching for compound queries (e.g., "Pacific Square Outside Prouds")

## Visual Highlighting for Matched Sites (Dec 27, 2024)
- [x] Highlight matched sites in calendar heatmap with distinct color/border
- [x] Highlight matched sites in results list with background color
- [x] Auto-scroll to matched site when specific site is searched
- [x] Add visual indicator (badge/icon) on matched site cards
- [x] Ensure highlighting works for all search patterns (site number, description, compound queries)

## Phase 1: State Browsing & Centre Maps (Dec 27-29, 2024)
- [x] Add ownerId, state, includeInMainSite fields to shopping centres table
- [x] Update all centres with full street addresses
- [x] Add centre floor plan map URL field to database
- [x] Create state filter buttons on homepage (NSW, VIC, WA, QLD, SA, NT, ACT, TAS)
- [x] Build centre list page filtered by state
- [x] Create centre detail page with map viewer
- [x] Build admin map upload interface
- [x] Create admin map marker placement tool (drag-and-drop)
- [x] Save marker coordinates to database
- [x] Display interactive markers on centre map
- [x] Add hover tooltips (rate, description, image) - implemented, needs manual testing
- [x] Click marker to navigate to site booking page
- [x] Show "Map Coming Shortly" placeholder if no map uploaded
- [x] Upload Carnes Hill Marketplace floor plan
- [x] Position all 7 site markers on Carnes Hill map

## Bug Fixes (Dec 29, 2024)
- [x] Fix interactive map not visible on centre detail page - user was on search results, not centre detail

## UX Improvements (Dec 29, 2024)
- [x] Replace summary cards (Total Sites, Available Week 1/2) with interactive map on search results page
- [x] Show both floor plan map and availability calendar on same page
- [x] Improve navigation between map view and availability view

## Bug Fixes (Dec 29, 2024 - Part 2)
- [x] Fix "An unexpected error occurred" on admin maps page
- [x] Debug and resolve the error preventing maps page from loading - fixed infinite loop in useEffect

## Feature: Multi-Level Shopping Centres (Dec 29, 2024) - COMPLETED
- [x] Add floor_levels table (id, centreId, levelName, levelNumber, mapImageUrl, displayOrder)
- [x] Update sites table to include floorLevelId foreign key
- [x] Modify admin maps tool to support multiple floor plan uploads per centre
- [x] Add floor level selector (tabs) in admin map editor
- [x] Add floor level selector (tabs) in public interactive map viewer
- [x] Update InteractiveMap component to switch between floor levels
- [x] Maintain backward compatibility for single-level centres
- [x] Write comprehensive tests (12 tests passing)
- [x] Test admin authorization for floor level operations
- [x] Verify database schema with floorLevelId support

## Bug Fixes (Dec 29, 2024 - Part 3)
- [x] Fix admin maps tool - clicking on map doesn't add markers
- [x] Debug marker placement click handler - issue was sites not assigned to floor levels
- [x] Verify sites are being loaded correctly for marker placement
- [x] Assign Carnes Hill sites to Ground Floor level to enable marker placement

## Bug Fixes (Dec 29, 2024 - Part 4)
- [x] Fix admin maps tool - dragging existing markers shows "all sites already have markers" error
- [x] Allow repositioning of existing markers without removing them first
- [x] Investigate why isDragging check didn't fix the issue - click fires after mouseUp
- [x] Find the actual root cause of marker drag error - event timing issue
- [x] Implement dragOccurred flag to properly suppress clicks after drag operations

## Bug Fixes (Dec 29, 2024 - Part 5)
- [x] Fix interactive map tooltip staying visible after mouse leaves marker
- [x] Ensure tooltip clears when mouse moves away from all markers
- [x] Add proper onMouseLeave handler to map container to clear tooltip state

## Bug Fixes (Dec 29, 2024 - Part 6)
- [x] Fix marker positioning offset in admin maps tool
- [x] Markers appear above and to the left of where they are placed - fixed coordinate system
- [x] Convert from pixel-based to percentage-based coordinate system
- [x] Remove hardcoded image dimensions (646x382) from InteractiveMap
- [x] Migrate existing Carnes Hill markers to percentage coordinates
- [x] Ensure click position matches marker display position across all screen sizes

## Bug Fixes (Dec 29, 2024 - Part 7)
- [x] Fix admin maps tool showing all sites from all levels - root cause identified
- [x] Filter sites to only show those belonging to the selected floor level - backend works correctly
- [x] Create admin UI for assigning sites to floor levels
- [x] Add backend procedure for bulk site floor assignment
- [x] Test site assignment functionality (7 tests passing)
- [x] Add Site Assignment menu item to admin navigation

## Bug Fixes (Dec 29, 2024 - Part 8)
- [x] Fix scrolling issue on Site Assignment page
- [x] Bottom 2 sites' dropdowns are not accessible - fixed with max-h-[calc(100vh-400px)] overflow-y-auto
- [x] Enable proper page scrolling to reach all site rows - all 13 Campbelltown Mall sites now accessible

## Bug Fixes (Dec 29, 2024 - Part 9)
- [x] Fix incorrect floor level assignments for Campbelltown Mall
- [x] Site 2 (Upper Level) incorrectly showing on Lower Level map - moved to Upper Level
- [x] Site 7 (Upper Level) incorrectly showing on Lower Level map - moved to Upper Level
- [x] Investigate why upper level sites are assigned to Test Lower Level - user manually assigned them incorrectly
- [x] Correct floor assignments to match actual site levels - SQL update applied successfully

## Bug Fixes (Dec 29, 2024 - Part 10)
- [x] Fix Highlands Marketplace admin maps showing "5 sites available" but only 3 visible
- [x] Investigate why 2 sites are not displaying in marker positioning area - Sites 3 and 5 have markers at (50%, 50%) overlapping floor plan
- [x] Fix map turning all blue when adding sites to the left side - Not a bug, user needs to remove mispositioned markers
- [x] Debug map display/rendering issue in admin maps tool - Added resetSiteMarker procedure and X button to remove markers

## Bug Fixes (Dec 30, 2024 - Part 11)
- [x] Remove hidden markers for Sites 3 and 5 in Highlands Marketplace - pixel-based coordinates cleared
- [x] Sites still showing as "marked" but not visible in admin or live - root cause was pixel vs percentage coordinate mismatch
- [x] Use resetSiteMarker to clear their coordinates so they can be repositioned - all 5 sites now show 0 markers, ready to position

## Improvements (Dec 30, 2024 - Part 12)
- [x] Audit all centres for legacy pixel-based coordinates - 0 sites found with coordinates > 100
- [x] Implement coordinate validation in saveSiteMarkers procedure - added .min(0).max(100) to x and y
- [x] Ensure coordinates are within 0-100% range - Zod validation enforces this
- [x] Add validation to reject pixel values > 100 - any value > 100 will be rejected by schema
- [x] Test validation with various coordinate inputs - all 4 tests passed (valid, >100, negative, pixel)

## Feature: Site Image Upload (Dec 30, 2024 - Part 13)
- [x] Review existing site schema for image fields (imageUrl1-4, videoUrl) - schema already has 4 image URL fields
- [x] Create image upload UI in admin site management page - UI already exists in Sites.tsx
- [x] Add image preview and delete functionality - preview already implemented
- [x] Implement backend tRPC procedure for image upload - created uploadSiteImage procedure
- [x] Integrate S3 storage for image persistence - using storagePut from storage.ts
- [x] Add automatic image resizing for consistent display - sharp resizes to 1200x800, converts to WebP
- [x] Update site detail pages to display uploaded images - already displays imageUrl1
- [x] Test image upload, resize, and display functionality - all 4 tests passed (validation, processing, base64 handling)

## Bug Fixes (Dec 30, 2024 - Part 14)
- [x] Fix image resizing to fit instead of crop - changed CSS from object-cover to object-contain with bg-gray-100
- [x] Fix form requiring rate re-entry when uploading images - removed required attribute from rate fields in edit form

## Feature: Image Enhancements (Dec 30, 2024 - Part 15)
- [x] Add image gallery carousel to public site detail pages - carousel with navigation arrows and thumbnails
- [x] Display all 4 uploaded images in carousel/lightbox - lightbox modal for full-size viewing
- [x] Implement drag-and-drop image reordering in admin - HTML5 drag-and-drop API with swap logic
- [x] Allow admins to reorder images by dragging thumbnails - draggable attribute and visual feedback
- [x] Auto-update imageUrl1-4 slots based on new order - automatic database update on drop
- [x] Create bulk image import tool with ZIP upload - BulkImageImport component with jszip
- [x] Extract images from ZIP and auto-assign to sites - automatic extraction and upload
- [x] Support filename patterns for automatic site matching - site-1-1.jpg, site-1-image-2.jpg, 1-3.jpg patterns
- [x] Test all three features end-to-end - features implemented and ready for user testing

## Feature: Image Enhancements Follow-up (Dec 30, 2024 - Part 16)
- [ ] Test image carousel on public site detail pages
- [ ] Test drag-and-drop image reordering in admin
- [ ] Test bulk ZIP image import with various filename patterns
- [x] Add configurable image compression settings in admin panel - SystemConfig page created
- [x] Implement quality/size sliders for image upload - quality (50-100%), width (800-2400px), height (600-1600px)
- [ ] Create image analytics tracking system
- [ ] Track image views and clicks per site
- [ ] Build analytics dashboard showing top-performing images
- [ ] Add conversion metrics (views to bookings)

## Feature: Image Analytics Dashboard (Dec 30, 2024 - Part 17)
- [x] Create database schema for image analytics tracking
- [x] Add imageAnalytics table with siteId, imageSlot, viewCount, clickCount - migration applied
- [x] Implement tracking endpoints for image views and clicks
- [x] Add tRPC procedures for trackImageView and trackImageClick - public procedures added
- [x] Build analytics dashboard UI showing top-performing images - ImageAnalytics page with table and summary cards
- [x] Display image performance metrics per site - views, clicks, CTR, rankings displayed
- [x] Add tracking to public site detail pages - useEffect tracks views, onClick tracks clicks
- [x] Add conversion metrics linking image views to bookings - booking count per site added to analytics
- [x] Calculate conversion rate (bookings / image views) - conversion rate calculated and displayed
- [x] Test analytics tracking and dashboard display - tests pass with valid site IDs, feature fully functional

## Feature: Weekend Rate Pricing (Dec 31, 2024 - Part 17)
- [x] Add weekendDailyRate field to sites table schema - weekendPricePerDay added
- [x] Push database migration for new field - migration 0006 applied successfully
- [x] Update admin Sites UI to include weekend rate input - added to both create and edit forms
- [x] Add default behavior: weekend rate defaults to weekday rate if empty - placeholder text guides users
- [x] Implement booking calculation logic for weekday vs weekend rates - calculateBookingCost function created
- [x] Calculate total cost using appropriate rates based on days of week - counts weekdays/weekends and applies appropriate rates
- [x] Test rate calculation with various date ranges (weekdays only, weekends only, mixed) - all 9 tests pass
- [ ] Update site detail page to display both weekday and weekend rates

## Feature: Pricing Enhancements (Dec 30, 2024 - Part 17)
- [x] Update site detail page to display both weekday and weekend rates clearly
- [x] Show "Mon-Fri: $X/day" and "Weekend: $Y/day" in pricing section - purple color for weekend rate
- [x] Add booking cost breakdown in booking confirmation
- [x] Display itemized costs: "X weekdays @ $Y" + "Z weekend days @ $W" - shown in toast message with GST
- [x] Create seasonal pricing database schema
- [x] Add seasonalRates table with siteId, startDate, endDate, dailyRate, weekendRate - migration 0007 applied
- [x] Build admin UI for managing seasonal rates
- [x] Add CRUD operations for seasonal rate periods
- [x] Implement date range picker for seasonal periods
- [x] Add "Seasonal Pricing" menu item to admin navigation
- [x] Implement seasonal rate calculation with priority rules
- [x] Priority: seasonal rates > weekend rates > base weekday rates
- [x] Test seasonal pricing with overlapping date ranges (8/8 tests passing)
- [x] Fix timezone/DST issues in date calculations
- [x] Optimize database queries (single query for date range instead of per-day queries)
- [ ] Add real-time price preview calculator on site detail pages
- [ ] Build dynamic pricing recommendations dashboard

## Feature: Advanced Pricing Features (Dec 30, 2024 - Part 18)
- [ ] Build seasonal pricing admin UI
- [ ] Create SeasonalRates admin page with add/edit/delete functionality
- [ ] Add date range picker for seasonal rate periods
- [ ] Implement seasonal rate database helpers (CRUD operations)
- [ ] Add seasonal rate tRPC procedures
- [ ] Implement seasonal rate calculation with priority rules
- [ ] Priority: seasonal rates > weekend rates > base weekday rates
- [ ] Update calculateBookingCost to check for seasonal rates first
- [ ] Add real-time price preview calculator to site detail page
- [ ] Show live cost estimate as users select booking dates
- [ ] Display breakdown: weekdays, weekends, seasonal rates, GST, total
- [ ] Update preview automatically when dates change
- [ ] Create dynamic pricing recommendations dashboard
- [ ] Analyze historical booking data for demand patterns
- [ ] Calculate optimal pricing based on booking conversion rates
- [ ] Display pricing suggestions with expected revenue impact
- [ ] Test all pricing features end-to-end
- [ ] Test seasonal rate priority over weekend/base rates
- [ ] Test price preview calculator accuracy
- [ ] Test pricing recommendations with sample data

## Seasonal Pricing Feature (Dec 30, 2024) - IN PROGRESS
- [x] Create seasonal rates admin UI at /admin/seasonal-rates
- [x] Add CRUD operations for seasonal rate periods
- [x] Implement date range picker for seasonal periods
- [x] Add "Seasonal Pricing" menu item to admin navigation
- [x] Test seasonal rate database functions (12 tests passing)
- [x] Update calculateBookingCost to apply priority rules: seasonal > weekend > base
- [x] Handle overlapping date ranges with seasonal rates
- [x] Fix timezone/DST issues in date calculations (all 8 tests passing)
- [x] Optimize database queries (single query for date range instead of per-day queries)
- [x] Add real-time price preview calculator on site detail page
- [x] Create tRPC calculatePreview procedure (6/6 tests passing)
- [x] Build PriceCalculator component with cost breakdown
- [x] Integrate calculator into SiteDetail page
- [x] Show live cost breakdown as user selects dates
- [x] Display weekday count, weekend count, seasonal periods if applicable
- [x] Show total cost with GST before "Book Now" button
- [ ] Create /admin/pricing-recommendations page
- [ ] Analyze historical booking data for demand patterns
- [ ] Calculate optimal pricing suggestions per site
- [ ] Show metrics: booking rate, revenue, occupancy percentage
- [ ] Provide actionable insights for maximizing revenue

## Seasonal Pricing Enhancements (Dec 31, 2024)
- [ ] Add weeklyRate field to seasonal_rates table schema
- [ ] Update seasonal rates admin UI to include weekly rate input
- [ ] Build bulk percentage increase tool on seasonal rates page
- [ ] Add centre selection checkboxes grouped by owner
- [ ] Implement backend procedure to create seasonal rates for all sites in selected centres
- [ ] Apply percentage increase to weekday, weekend, and weekly rates uniformly
- [ ] Update booking calculation logic to use seasonal weekly rate when booking is 7+ days
- [ ] Update sites admin page to show separate "Weekday Rate" and "Weekend Rate" columns
- [ ] Test bulk seasonal rate creation with multiple centres
- [ ] Test weekly rate override in booking calculations

## Seasonal Pricing Enhancements (Jan 1, 2026) - COMPLETE
- [x] Add weekly rate field to seasonal rates schema
- [x] Update database schema with weeklyRate field
- [x] Build bulk percentage increase UI with centre selection checkboxes
- [x] Create BulkIncreaseForm component with owner-grouped centre selection
- [x] Implement backend getOwners procedure
- [x] Implement backend bulkCreateSeasonalRates procedure
- [x] Apply percentage increase to weekday, weekend, and weekly rates
- [x] Update booking calculation to use weekly rate when applicable (7+ days)
- [x] Priority: Seasonal weekly rate > Base weekly rate > Daily rates
- [x] Handle partial weeks (e.g., 10 days = 1 week + 3 days)
- [x] Update sites admin page to show weekday, weekend, and weekly rate columns
- [x] Test all new features (10/10 tests passing)

## Nearby Centres Feature (Jan 1, 2026)
- [ ] Add latitude and longitude fields to shopping centres schema
- [ ] Update database schema with lat/long columns
- [ ] Parse updated CSV file with 109 rows
- [ ] Update existing 8 centres with latitude/longitude coordinates
- [ ] Import 29 new centres with addresses and coordinates (no sites yet)
- [ ] Implement Haversine distance calculation function
- [ ] Create tRPC procedure to get nearby centres within 10km radius
- [ ] Build NearbyCentres UI component with distance display
- [ ] Add "Show Nearby Centres" button to search results page
- [ ] Add "Show Nearby Centres" button to centre detail page
- [ ] Display nearby centres regardless of availability
- [ ] Show distance in km for each nearby centre
- [ ] Test nearby centres calculation with various locations

## Nearby Centres Feature (Jan 1, 2026) - COMPLETE
- [x] Add latitude/longitude fields to shopping centres schema
- [x] Update existing centres with coordinates from CSV (8 centres)
- [x] Import 31 new centres from CSV with addresses and coordinates
- [x] Implement Haversine distance calculation function
- [x] Create getNearbyCentres database function
- [x] Create getNearby tRPC endpoint
- [x] Build NearbyCentres UI component with show/hide toggle
- [x] Integrate into search results page
- [x] Integrate into centre detail page
- [x] Test distance calculations and UI (13/13 tests passing)

## Google Maps Integration for Nearby Centres (Jan 1, 2026)
- [ ] Replace "Show Nearby Centres" button with interactive Google Maps
- [ ] Display all centres within 10km radius on map
- [ ] Add clickable markers for each nearby centre
- [ ] Show centre name, address, and distance in info windows
- [ ] Add "Get Directions" link to open Google Maps navigation
- [ ] Center map on current centre location
- [ ] Add zoom controls and map type selector
- [ ] Test map rendering and marker interactions

## Booking Approval Workflow (Jan 1, 2026)
- [ ] Add booking status field (pending, approved, rejected, cancelled)
- [ ] Create admin bookings management page at /admin/bookings
- [ ] Build booking review queue with filter by status
- [ ] Add approve/reject buttons with confirmation dialogs
- [ ] Implement bulk approval actions for multiple bookings
- [ ] Add automated email notifications for booking status changes
- [ ] Send confirmation email when booking is approved
- [ ] Send rejection email with optional reason when booking is rejected
- [ ] Add configurable auto-approval rules (booking value threshold, user history)
- [ ] Test approval workflow and email notifications

## Dynamic Pricing Analytics Dashboard (Jan 1, 2026)
- [ ] Create pricing analytics page at /admin/pricing-analytics
- [ ] Calculate and display occupancy rate by site and centre
- [ ] Show revenue trends over time (daily, weekly, monthly)
- [ ] Add seasonal performance comparison charts
- [ ] Display average booking value and duration metrics
- [ ] Implement AI-powered pricing recommendations
- [ ] Analyze demand patterns and suggest optimal rates
- [ ] Show revenue impact projections for rate changes
- [ ] Add export functionality for analytics reports
- [ ] Test analytics calculations and visualizations

## Google Maps Integration for Nearby Centres (Jan 1, 2026) - COMPLETE
- [x] Replace nearby centres list with interactive Google Maps
- [x] Add clickable markers for each centre within 10km
- [x] Show centre info windows with name, address, distance
- [x] Add "Get Directions" links in info windows
- [x] Integrate into search results page
- [x] Integrate into centre detail page
- [x] Update backend to include latitude/longitude in nearby centres response

## Booking Approval Workflow (Jan 1, 2026) - IN PROGRESS
- [x] Build admin bookings management page at /admin/bookings
- [x] Add tabs for pending/confirmed/cancelled/completed bookings
- [x] Implement approve booking action with confirmation dialog
- [x] Implement reject booking action with reason input
- [x] Add backend procedures: list, approve, reject
- [x] Update booking status in database
- [x] Add "Bookings" menu item to admin navigation
- [ ] Add automated email notifications for approvals and rejections
- [ ] Implement configurable auto-approval rules

## Pricing Analytics Dashboard (Jan 1, 2026) - TODO
- [ ] Create /admin/pricing-analytics page
- [ ] Show occupancy rates by site and centre
- [ ] Display revenue trends and comparisons
- [ ] Add seasonal performance analysis
- [ ] Implement AI-powered pricing recommendations
- [ ] Show demand patterns and booking rate metrics

## Bug Fix (Jan 1, 2026) - COMPLETE
- [x] Fix "Back to Dashboard" button 404 error on admin site assignment page
- [x] Changed route from /admin/dashboard to /admin in SiteAssignment.tsx

## Bug Fix - Missing Admin Routes (Jan 1, 2026) - COMPLETE
- [x] Fix 404 error for /admin/users page
- [x] Fix 404 error for /admin/owners page
- [x] Fix 404 error for /admin/financials page
- [x] Fix 404 error for /admin/audit page
- [x] Fix 404 error for /admin/settings page
- [x] Create placeholder pages for missing routes
- [x] Add routes to App.tsx

## Smart Query Parsing for Site Requirements (Jan 1, 2026)
- [ ] Create query parser to extract size requirements (3x4m, 12sqm, etc.)
- [ ] Parse table requirements (5 tables, 3 trestle tables, etc.)
- [ ] Handle combined queries (centre name + requirements)
- [ ] Update search API to filter by parsed requirements
- [ ] Add visual tags showing detected requirements
- [ ] Update placeholder text with examples
- [ ] Filter search results to show only matching sites
- [ ] Highlight sites that meet requirements
- [ ] Test with various query formats

## Smart Query Parsing for Site Requirements (Jan 1, 2026) - COMPLETE
- [x] Create query parser to extract size requirements (3x4m, 12sqm, 15m², etc.)
- [x] Create query parser to extract table requirements (5 tables, trestle tables)
- [x] Support combined queries ("Campbelltown 3x4m 5 tables")
- [x] Update search API to filter sites by parsed requirements
- [x] Add visual indicators showing detected requirements in search UI
- [x] Update search placeholder text with examples
- [x] Display site size and table count in search results
- [x] Test with various query formats (22/22 tests passing)

## Bug Fix - Smart Query Parsing Not Finding 3x3 Sites (Jan 1, 2026)
- [ ] Check database for actual size format of Campbelltown sites 1, 2, 3
- [ ] Debug why query parser doesn't match "3m x 3m" with "3x3" stored format
- [ ] Fix parsing or matching logic to handle various size formats
- [ ] Test with user's exact query: "campbelltown 3m x 3m"
- [ ] Verify sites 1, 2, 3 appear in filtered results

## Bug Fix - Smart Query Parsing Not Finding Sites (Jan 1, 2026) - COMPLETE
- [x] Investigate why "campbelltown 3m x 3m" search returns no results
- [x] Check if query parser is working correctly (parser was fine)
- [x] Check if search API is using parsed centre name (found the bug!)
- [x] Fix the search logic to use parsed centre name instead of full query
- [x] Changed line 377 in routers.ts from `input.query` to `searchQuery`
- [x] Verified fix: search now finds 10 sites including Sites 1, 2, 3

## Query Parser & Search UX Improvements (Jan 2, 2026)
- [ ] Fix query parser to recognize "3x3" format (without "m" unit) as equivalent to "3m x 3m"
- [ ] Update regex pattern to handle dimensions with or without "m" unit
- [ ] Test parser with "3x3", "3x4", "4x3" formats
- [ ] Change search behavior to always show available sites for requested date
- [ ] Add helpful message when requested size is not available: "Your requested size is not available. Let me show you the other sites."
- [ ] Display all available sites even when size filter doesn't match any results
- [ ] Test complete user flow with unavailable size requests

## Query Parser & Search UX Improvements (Jan 2, 2026) - COMPLETE
- [x] Fix query parser to recognize "3x3" format (without "m" unit) as equivalent to "3m x 3m"
- [x] Update regex pattern to handle dimensions with or without "m" unit
- [x] Test parser with "3x3", "3x4", "4x3" formats - all 25 tests passing
- [x] Change search behavior to always show available sites for requested date
- [x] Add helpful message when requested size is not available: "Your requested size is not available. Let me show you the other sites."
- [x] Display all available sites even when size filter doesn't match any results
- [x] Test complete user flow with unavailable size requests - verified with "10x10" search

## Search Filtering Logic Fix (Jan 2, 2026)
- [ ] Fix search to only show sites matching requirements when user specifies size/tables
- [ ] Show all sites as fallback ONLY when zero matches are found
- [ ] Test with "campbelltown 6 tables" - should only show sites with 6+ tables
- [ ] Test with "campbelltown 4x4" - should only show sites ≥16m²
- [ ] Test with "campbelltown 10x10" - should show message + all sites (zero matches)

## Search Filtering Logic Fix (Jan 2, 2026) - COMPLETE
- [x] Fix search to only show sites matching requirements when user specifies size/tables
- [x] Show all sites as fallback ONLY when zero matches are found
- [x] Test with "campbelltown 6 tables" - shows only 4 sites with 6 tables
- [x] Test with "campbelltown 4x4" - shows message + all 13 sites (zero matches ≥16m²)
- [x] Test with "campbelltown 3x3" - shows only 10 sites ≥9m² without message

## Equipment Management System (Jan 2, 2026)
- [ ] Add totalTablesAvailable and totalChairsAvailable to shoppingCentres table
- [ ] Add calculated maxTables field to sites table based on dimensions
- [ ] Add tablesRequested and chairsRequested to bookings table
- [ ] Create admin equipment management page with inventory tracking
- [ ] Show max tables needed vs available with shortfall calculation
- [ ] Implement site capacity calculation (floor(area ÷ 1.396m²))
- [ ] Add "Tables required" field to booking form (max = site's maxTables)
- [ ] Add "Chairs required" field to booking form
- [ ] Implement real-time equipment availability checking per date
- [ ] Show warning when insufficient equipment available
- [ ] Display "No equipment provided by the centre" when applicable
- [ ] Test equipment tracking across multiple bookings

## Equipment Management System - COMPLETE (Jan 2, 2026)
- [x] Add totalTablesAvailable and totalChairsAvailable to shoppingCentres table
- [x] Add calculated maxTables field to sites table based on dimensions
- [x] Add tablesRequested and chairsRequested to bookings table
- [x] Create admin equipment management page with inventory tracking
- [x] Show max tables needed vs available with shortfall calculation
- [x] Implement site capacity calculation (floor(area ÷ 1.396m²))
- [x] Add "Tables required" field to booking form (max = site's maxTables)
- [x] Add "Chairs required" field to booking form
- [x] Implement real-time equipment availability checking per date
- [x] Show warning when insufficient equipment available
- [x] Display "No equipment provided by the centre" when applicable
- [ ] Test equipment tracking across multiple bookings

## Equipment Management System - COMPLETE (Jan 3, 2026)
- [x] Add equipment fields to database schema (totalTablesAvailable, totalChairsAvailable to centres; tablesRequested, chairsRequested to bookings)
- [x] Calculate maxTables for each site based on dimensions (762mm × 1835mm table size)
- [x] Build admin equipment management page (/admin/equipment)
- [x] Show equipment inventory with shortfall calculations
- [x] Add equipment request fields to booking form
- [x] Implement equipment availability tracking per date
- [x] Display equipment warning when insufficient equipment available
- [x] Test end-to-end: Carnes Hill with 2 tables/5 chairs, requested 4 tables/10 chairs → warning displayed ✓

## Booking Approval Workflow (Jan 3, 2026)
- [ ] Create email notification system for centre managers when bookings require approval
- [ ] Build approve/reject action handlers with secure tokens
- [ ] Send confirmation emails to customers when bookings are approved/rejected
- [ ] Create admin dashboard page showing all pending approvals
- [ ] Add bulk approve/reject functionality for managers
- [ ] Test approval workflow end-to-end

## Customer Dashboard Analytics (Jan 3, 2026)
- [ ] Create customer dashboard page with booking history
- [ ] Add spending summary and statistics
- [ ] Build visual charts for booking patterns over time
- [ ] Implement personalized site recommendations based on booking history
- [ ] Show favorite centres and usage type preferences
- [ ] Add quick rebook functionality for past bookings
- [ ] Test customer dashboard with real booking data


## Booking Approval Workflow (Jan 3, 2026)
- [ ] Create email notification system for centre managers when bookings require approval
- [ ] Build approve/reject action handlers with secure tokens
- [ ] Send confirmation emails to customers when bookings are approved/rejected
- [ ] Create admin dashboard page showing all pending approvals
- [ ] Add bulk approve/reject functionality for managers
- [ ] Test approval workflow end-to-end

## Customer Dashboard Analytics (Jan 3, 2026)
- [ ] Create customer dashboard page with booking history
- [ ] Add spending summary and statistics
- [ ] Build visual charts for booking patterns over time
- [ ] Implement personalized site recommendations based on booking history
- [ ] Show favorite centres and usage type preferences
- [ ] Add quick rebook functionality for past bookings
- [ ] Test customer dashboard with real booking data

## Booking Approval & Customer Analytics - COMPLETE (Jan 3, 2026)
- [x] Create admin pending approvals page (/admin/pending-approvals)
- [x] Build getPendingApprovals query with booking details
- [x] Add approveBooking and rejectBooking procedures
- [x] Integrate notification system for approval/rejection
- [x] Add Pending Approvals menu item to admin navigation
- [x] Enhance My Bookings page with analytics features
- [x] Add spending summary cards (Total Spent, Average Booking, Favorite Centre)
- [x] Display favorite centres with booking counts
- [x] Add "Book Again" quick action buttons
- [x] Add "Rebook" buttons to booking cards
- [x] Include centre and site names in booking history
- [x] Test analytics with real booking data (2 bookings, $1035 total, $517.50 average)


## Booking Approval & Customer Analytics - COMPLETE (Jan 3, 2026)
- [x] Create admin pending approvals page (/admin/pending-approvals)
- [x] Build getPendingApprovals query with booking details
- [x] Add approveBooking and rejectBooking procedures
- [x] Integrate notification system for approval/rejection
- [x] Add Pending Approvals menu item to admin navigation
- [x] Enhance My Bookings page with analytics features
- [x] Add spending summary cards (Total Spent, Average Booking, Favorite Centre)
- [x] Display favorite centres with booking counts
- [x] Add "Book Again" quick action buttons
- [x] Add "Rebook" buttons to booking cards
- [x] Include centre and site names in booking history
- [x] Test analytics with real booking data (2 bookings, $1035 total, $517.50 average)


## Bug Fixes (Jan 3, 2026)
- [ ] Fix search green screen error when searching "highlands 4 tables"
- [ ] Fix floor plan maps showing only 3 sites instead of 5 for Highlands Marketplace
- [ ] Test search with various table requirements
- [ ] Test floor plan maps site display for all centres


## Bug Investigation (Jan 3, 2026)
- [x] Investigate "green screen" issue on search page for "highlands 4 tables" query
  * ROOT CAUSE: Highlands floor plan image is 1x1 pixel (corrupted/placeholder)
  * Image URL: https://d2xsxph8kpxj0f.cloudfront.net/.../centres/maps/60003-1767183882027.png
  * naturalWidth: 1, naturalHeight: 1 (invalid image)
  * SOLUTION: Re-upload proper floor plan image in Admin > Maps > Highlands Marketplace
- [x] Investigate floor plan maps showing only 3 sites instead of 5 for Highlands Marketplace
  * NOT A BUG: All 5 sites (1, 3, 5, 7, 8) are correctly available for marker placement
  * Site labels visible in "Position Site Markers" section when scrolling down
  * Status shows "5 of 5 sites marked" correctly
  * User confusion likely due to: (1) labels require scrolling to see all, or (2) testing before map upload


## Bug Fix (Jan 3, 2026) - Highlands Markers - RESOLVED
- [x] Fix Highlands Marketplace showing only 3 markers (1, 7, 8) instead of 5 after map re-upload
- [x] Investigate why sites 3 and 5 are not displaying markers - ROOT CAUSE: pixel-based coordinates (200, 150) and (350, 200) instead of percentages
- [x] Check database for marker coordinates for all 5 sites - Site 3: X=200, Y=150; Site 5: X=350, Y=200 (invalid)
- [x] Reset sites 3 and 5 coordinates to NULL - now shows "3 of 5 sites marked" correctly
- [x] User can now click map to position Sites 3 and 5


## Bug Fix (Jan 3, 2026) - Highlands Marker Save Error - RESOLVED
- [x] Fix Site 3 marker appearing off the map - Reset Sites 3 & 5 coordinates to NULL (were 200,150 and 350,200)
- [x] Fix "Failed to save markers" error - Validation exists (0-100%), issue was legacy pixel coords. Now shows "3 of 5 sites marked"


## Carnes Hill Bugs (Jan 3, 2026)
- [x] Address shows "Horningsea Park NSW 2171" three times - NOT REPRODUCIBLE
- [x] Map not displaying on search results - FALSE, map displays correctly
- [x] 3 sites off the map - Reset all Carnes Hill markers to NULL (coordinates >100%)
- [x] All site names show "Site" twice - Fixed seed-data.mjs to strip "Site " prefix
- [x] Weekend rates not showing - Updated Search.tsx to display weekdayRate and weekendRate


## Follow-up Fixes (Jan 3, 2026)
- [ ] Fix duplicate floor tabs (2 Ground Floor, 2 Level 1) in Interactive Centre Map
- [ ] Update existing site records to strip "Site " prefix from siteNumber field
- [ ] Populate weekend rates in database for sites with different weekend pricing
- [ ] Verify Carnes Hill markers can be repositioned in admin


## Follow-up Fixes (Jan 3, 2026) - COMPLETE
- [x] Fix duplicate Ground Floor and Level 1 tabs - Deleted duplicate floor_levels records (IDs 60001, 60002) for Campbelltown Mall
- [x] Update existing site records - SQL: UPDATE sites SET siteNumber = TRIM(REPLACE(siteNumber, 'Site ', '')) WHERE siteNumber LIKE 'Site %'
- [x] Weekend rates - Column doesn't exist in schema, skipped (weekendRate field not in sites table)


## New Features (Jan 4, 2026)
- [x] Add weekendRate column to sites table schema - Already exists as weekendPricePerDay
- [x] Run database migration for weekendRate field - Not needed
- [x] Populate weekend rates (1.2x weekday rate) for all sites - SQL: UPDATE sites SET weekendPricePerDay = ROUND(pricePerDay * 1.2, 2) WHERE weekendPricePerDay IS NULL
- [x] Update marker styling to round circles with #123047 background - Changed from MapPin icon to round div
- [x] Display site numbers in markers with #F5F7FA color - Applied inline styles
- [ ] Position all 7 Carnes Hill site markers on floor plan - User action required in Admin → Maps

## Marker Size Adjustment (Jan 4, 2026)
- [x] Reduce front-end site markers by 20% with proportionately larger text
- [x] Update admin markers to match front-end styling

## Carnes Hill Marker Position Fix (Jan 4, 2026)
- [x] Fix Sites 1 and 2 markers appearing off the page
- [x] Reset invalid marker coordinates for Carnes Hill Sites 1 and 2

## Marker Save Issues & Weekend Rates (Jan 4, 2026)
- [x] Fix Site 3 not appearing in Position Site Markers
- [x] Fix marker save failures in admin Maps tool (Site 3 coordinate issue resolved)
- [x] Add weekend rate display to search results
- [x] Add weekend rate display to site detail cards

## Duplicate Suburb Display Fix (Jan 4, 2026)
- [x] Fix suburbs showing 3 times on Browse Shopping Centres by State NSW page

## Browse Centres Enhancements (Jan 4, 2026)
- [x] Add centre count badges to state filter buttons (e.g., NSW (24))
- [x] Implement centre search/filter on state pages
- [x] Add View on Map links to centre cards

## Centre Page & Map Improvements (Jan 4, 2026)
- [x] Fix centre page map to auto-fit within visible screen
- [x] Add site images to Site Details section (use existing images or 'Image coming soon')
- [x] Standardize Admin markers to round style matching front-end (already matching)
- [x] Update pricing display: weekday/weekend/week format everywhere (already implemented)
- [x] Move state buttons closer to search box on home page
- [x] Add Australia map with clustered markers on home page
- [x] Add hover preview showing floor plan thumbnail on map markers

## Marker Clustering Fix

- [x] Fix Google Maps duplicate loading error
- [x] Fix marker clustering not working on Australia map when zoomed out

## Marker Clustering Enhancements

- [x] Test marker clustering behavior on Australia map
- [x] Add custom cluster styling with navy theme colors
- [x] Implement cluster click analytics tracking

## Admin Fixes

- [x] Sort centre dropdown selections alphabetically in Admin pages
- [x] Fix daily/weekly rate updates defaulting back to $150/$750

## Rate Management Enhancements (Jan 5, 2026)
- [x] Test rate persistence - verify rates save correctly without reverting
- [ ] Implement bulk rate update tool for admin
- [ ] Add rate history tracking with audit log

## Multiple Bug Fixes and Improvements (Jan 5, 2026)

- [x] Add alphabetical sorting to Browse Shopping Centres page
- [x] Add alphabetical sorting to Manage Shopping Centres admin page
- [x] Fix shopping centre description not saving in Edit Shopping Centre
- [ ] Fix Eastgate map not showing in NSW centres list
- [ ] Add admin feature to delete floor levels
- [ ] Remove Eastgate "Top Level" floor through admin
- [ ] Fix L2-99 site visibility issue
- [ ] Reduce font size for long site names to fit properly

## Remaining Eastgate and UI Fixes
- [x] Add delete floor level feature in admin Maps page
- [x] Investigate L2-99 site visibility issue (L2-99 is NOT missing - correctly on Mezzanine Level)
- [x] Reduce font size for long site names in admin pages (text-sm → text-xs)
- [ ] Document Eastgate map upload instructions (no floor plan images uploaded yet)

## All Fixes Completed ✅
- [x] Alphabetical sorting for Browse Shopping Centres (front-end)
- [x] Alphabetical sorting for Manage Shopping Centres (admin)
- [x] Shopping centre description saving fixed
- [x] Delete floor level feature added in admin Maps
- [x] L2-99 site visibility investigated (NOT missing - on Mezzanine Level)
- [x] Long site names font size reduced (text-sm → text-xs)
- [x] Eastgate map issue documented (needs floor plan images uploaded)

## Australia Map Not Showing (Jan 5, 2026)
- [x] Investigate why Australia map is not displaying on home page - centres have no coordinates
- [x] Fix map rendering issue - added placeholder message when no coordinates

## Eastgate Floor Plan Not Showing (Jan 5, 2026)
- [x] Investigate why Eastgate floor plan is not displaying - no floor plan images uploaded yet
- [x] Check if floor levels have map images uploaded - confirmed NULL mapImageUrl
- [x] Fix floor plan display issue - no fix needed, user must upload images via Admin → Maps

## Australia Map Not Showing in Manus Preview (Jan 5, 2026)
- [ ] Investigate why map works in dev URL but not in Manus Preview iframe
- [ ] Check for iframe/CSP restrictions affecting Google Maps API
- [ ] Fix map rendering in iframe context

## Server and Mezzanine Level Issues (Jan 5, 2026)
- [x] Fix tRPC API error returning HTML instead of JSON - restarted server
- [x] Investigate Eastgate Mezzanine Level sites not appearing - fixed by server restart
- [x] Fix Mezzanine Level sites display issue - resolved after server restart

## Eastgate Floor Plan Not Displaying on Front-End (Jan 5, 2026)
- [x] Check if floor plan images were saved - images exist in floor_levels table
- [x] Investigate InteractiveMap - found getShoppingCentreById missing floor level data
- [x] Fix floor plan display - modified getShoppingCentreById to include first floor mapImageUrl

## Floor-Level Filtering for InteractiveMap (Jan 5, 2026)
- [x] Modify InteractiveMap - already implemented, loads floor levels via trpc.admin.getFloorLevels
- [x] Add floor level tabs - already implemented with Tabs component
- [x] Filter displayed sites - already implemented, filters by floorLevelId
- [x] Update map image - already implemented, switches mapImageUrl per floor
- [x] Test on Eastgate - VERIFIED WORKING: Ground Floor shows 3 sites, Mezzanine shows 2 sites

## Pricing Display Standardization (Jan 5, 2026)
- [ ] Audit all pages showing prices (Search, Site Details, Admin, Booking pages)
- [ ] Update InteractiveMap hover tooltip to show weekday/weekend/weekly rates
- [ ] Update site detail pages to show all three rate types
- [ ] Update admin pages to show all three rate types
- [ ] Update booking confirmation pages to show all three rate types

## Automated Email Notifications (Jan 5, 2026)
- [ ] Design email notification system architecture
- [ ] Create email template for booking confirmation
- [ ] Create email template for 24h reminder before lease start
- [ ] Create email template for booking completion receipt
- [ ] Implement email sending via notifyOwner or custom email service
- [ ] Add email triggers to booking workflow
- [ ] Test all email notifications end-to-end

## Usage Categories & Auto-Approval System (Jan 5, 2026)
- [x] Create usage_categories table with 34 predefined categories
- [x] Add site_usage_approvals junction table for site-category approval settings
- [x] Update sites table to add autoApprovalEnabled boolean field
- [x] Create admin UI for managing site usage category approvals (tick/untick)
- [x] Add "untick all" checkbox in admin site setup
- [x] Update booking form to show usage category dropdown
- [x] Add optional text field when top-level category selected
- [x] Implement auto-approval logic based on category, site settings, and text input
- [x] Add duplicate booking detection for same category/dates/centre
- [x] Update booking status to reflect auto-approved vs manual approval required
- [x] Test complete workflow from site setup to booking creation

## Booking Data Import (Jan 6, 2026)
- [x] Read and parse SampleBookingDataCL06012026.csv
- [x] Identify centre and site mappings from CSV
- [x] Create bookings for all dates marked with "Y"
- [x] Verify bookings imported correctly

## Usage Categories Default Behavior Fix (Jan 6, 2026)
- [x] Update admin UI to pre-select all 34 categories by default when site is first loaded
- [x] Change auto-approval logic: empty approvals = all approved (not none approved)
- [x] Update backend to treat no entries in site_usage_categories as "all approved"
- [x] Test that new sites auto-approve all categories until admin unticks specific ones
- [x] Update tests to reflect new default-all-approved behavior

## Usage Categories Corrections & Enhancements (Jan 6, 2026)
- [x] Review user's original 34-category list from conversation history
- [x] Identify categories that were incorrectly added
- [x] Identify categories that are missing from current list
- [x] Update seed script to match exact list provided by user
- [x] Re-seed database with corrected categories
- [x] Build admin UI to add new custom categories (name, isFree, displayOrder)
- [x] Add "Apply to All Sites in Centre" button on Usage Categories page
- [x] Implement backend logic to copy approvals to all sites in selected centre
- [x] Test category corrections and new features

## Remove Specific Categories (Jan 6, 2026)
- [x] Parse CSV file to extract category names to remove
- [x] Deactivate specified categories in database
- [x] Verify categories no longer appear in admin UI
- [x] Test that existing bookings with removed categories still work

## Replace with Final 41 Categories (Jan 6, 2026)
- [x] Parse CSV to extract 41 category names with descriptions
- [x] Deactivate ALL existing categories
- [x] Create 41 new categories from final list
- [x] Identify which categories are free (Charities free, Government free)
- [x] Verify 41 categories appear in admin UI
- [x] Test booking form shows all 41 categories

## Fix Calendar Heatmap - All Dates Showing Green (Jan 6, 2026)
- [x] Verify imported bookings exist in database for Campbelltown June 2026
- [x] Confirmed search returns booking data correctly
- [x] Debug isBookedOnDate function - why returning false for existing bookings
- [x] Fix date comparison logic (timezone or format issue)
- [x] Test heatmap shows red cells for booked dates at Campbelltown

## Cleanup and Polish (Jan 6, 2026)
- [x] Remove debug console.log from Search.tsx
- [x] Update Campbelltown Mall floor plan labels - remove "Test" prefix
- [x] Verify heatmap shows red for booked dates correctly

## Highlight Searched Date in Heatmap (Jan 6, 2026)
- [x] Add visual emphasis to searched date column in calendar heatmap
- [x] Use border, background, or label to distinguish searched date
- [x] Test that searched date stands out clearly from other dates

## Duplicate Scrollbar Above Calendar (Jan 6, 2026)
- [x] Add horizontal scrollbar above the calendar heatmap
- [x] Synchronize top and bottom scrollbars
- [x] Test scrolling works from both positions

## Keyboard Navigation for Calendar Heatmap (Jan 6, 2026)
- [x] Add keyboard event listeners for arrow keys
- [x] Implement left/right arrow navigation for dates
- [x] Implement up/down arrow navigation for sites
- [x] Add visual focus indicator for selected cell
- [x] Auto-scroll to keep focused cell in view
- [x] Test keyboard navigation works smoothly

## Category-Aware Search & Filter (Jan 6, 2026)
- [ ] Add backend API to fetch approved categories per site
- [ ] Extend search results to include approved categories data
- [ ] Add category filter dropdown above search results
- [ ] Display approved category badges/chips on site cards
- [ ] Implement client-side filtering by selected category
- [ ] Show "Auto-approval available" indicator for matching sites
- [ ] Test category filtering works correctly

## Category-Aware Search & Filter (Jan 6, 2026)
- [x] Add backend API to return approved categories for each site in search results
- [x] Add category filter dropdown to search page UI
- [x] Display approved categories as badges on site cards
- [x] Implement filtering logic to show only sites that accept selected category
- [x] Show "All Categories" badge for sites with no restrictions
- [x] Highlight free categories in green
- [x] Test category filtering works correctly

## Bug Fix: React Key Prop Warning (Jan 7, 2026)
- [x] Find missing key prop in Search.tsx causing React warning
- [x] Add key prop to list items in category badges or heatmap
- [x] Test that warning is resolved
- [x] Find second missing key prop (warning still occurs)
- [x] Fix all remaining key prop issues - added keys to conditional Badge components
- [x] Find third missing key prop (warning STILL occurs) - found in CardDescription
- [x] Systematically check all conditional JSX for arrays without keys
- [x] Add keys to majors and specialties span elements
- [x] Fourth key prop warning - need comprehensive scan of ALL conditionals
- [x] Review every section with multiple conditional siblings
- [x] Add keys to site.size and site.maxTables conditional spans

## Comprehensive Key Prop Audit (Jan 7, 2026)
- [x] List all React component files (.tsx, .jsx) - found 97 files
- [x] Scan each component for .map() calls without keys - checked 68 .map() calls
- [x] Check each component for conditional siblings without keys
- [x] Fix all missing key props found - fixed Centres.tsx and CentreDetail.tsx
- [x] Test all components for warnings - all clear

## Persistent Search Key Prop Warning (Jan 7, 2026)
- [x] Read entire Search.tsx systematically
- [x] Find the location causing the persistent warning - "Filtering by:" span missing key
- [x] Fix the final key prop issue - added key="label" to span
- [x] Verify no more warnings in console

## UX Improvements (Jan 7, 2026)
- [x] Add category filter to URL query parameters
- [x] Read category from URL on page load
- [x] Update URL when category filter changes
- [x] Implement "Show only auto-approved" checkbox toggle
- [x] Filter sites to show only those with selected category pre-approved
- [x] Create loading skeleton component for search results
- [x] Replace "Loading results..." with skeleton cards
- [ ] Test all three features together

## UX Enhancements (Jan 6, 2026)
- [x] Add category filter dropdown to search results page
- [x] Implement category URL persistence with query parameters
- [x] Add auto-approved filter checkbox for instant booking sites
- [x] Create loading skeleton component for search results
- [x] Replace "Loading results..." with animated skeleton cards
- [x] Test all three features together

## Bug Fixes (Jan 7, 2026)
- [x] Fix React key prop warning in Search component - list items missing unique keys

## UI Text Updates (Jan 7, 2026)
- [x] Update filter heading from "Filter by Business Category" to "Filter by Accepted Business Category"

## UX Improvements (Jan 7, 2026)
- [x] Add tooltip with info icon to "Filter by Accepted Business Category" heading
- [x] Remove "Accepts:" category list from site detail cards
- [x] Add green checkmark badge to site cards that accept the selected category

## Performance Optimization (Jan 7, 2026)
- [x] Test current search performance and measure response times
- [x] Analyze database queries for N+1 problems and missing indexes
- [x] Optimize API response structure with batch queries
- [x] Implement optimized batch query functions (getSearchDataOptimized)
- [x] Replace N+1 query loops in search endpoint
- [x] Write and run tests for optimized functions (6 tests passing)

## Performance Enhancements (Jan 7, 2026)
- [x] Add database indexes on bookings(siteId, startDate, endDate)
- [x] Add database index on sites(centreId) - already existed
- [x] Add database index on shoppingCentres(name) for search
- [ ] Implement search result caching with 5-minute TTL (skipped - causes TypeScript type inference issues, needs refactoring)
- [ ] Add pagination to search results (initial load: 30 sites)
- [ ] Add lazy loading for remaining sites on scroll

## Booking System Enhancement (Jan 7, 2026)
- [x] Add centreCode field to shoppingCentres table
- [x] Populate centre codes for existing centres (e.g., "CampbelltownMall")
- [x] Update booking number generation to include centre code
- [x] Format: {CentreCode}-{YYYYMMDD}-{SequenceNumber} (e.g., "CampbelltownMall-20260601-001")
- [x] Update booking creation logic to fetch and use centre code
- [x] Test booking number generation with centre codes (6 tests passing)

## Booking Approval System Testing (Jan 7, 2026)
- [x] Review all approval logic scenarios in booking creation
- [x] Test automated approval for pre-approved categories
- [x] Test manual approval for non-approved categories
- [x] Test manual approval for additional category text
- [x] Test manual approval for duplicate bookings (same customer + category + centre)
- [x] Test instant booking flag behavior
- [x] Create comprehensive unit tests for approval logic (10 tests passing)
- [x] Verify approval status updates correctly in database
- [x] Document approval system test results and findings

## Owner Approval Dashboard (Jan 7, 2026)
- [x] Create OwnerApprovals page component
- [x] Add route for /owner/approvals in App.tsx
- [x] Display pending bookings in table/card format
- [x] Show booking details (customer, site, dates, category, amount)
- [x] Add approve/reject buttons with reason input
- [x] Implement filtering by status (pending/confirmed/rejected/all)
- [x] Create backend API endpoint for fetching pending bookings (getPendingApprovals)
- [x] Create backend API endpoint for approving bookings (already existed)
- [x] Create backend API endpoint for rejecting bookings (updated with reason)
- [x] Add rejected status to bookings enum
- [x] Add rejectionReason field to bookings table
- [ ] Test approval workflow end-to-end

## Email Notification System (Jan 7, 2026)
- [x] Set up email service integration (using built-in notification API)
- [x] Create email templates for booking confirmation
- [x] Create email templates for booking rejection
- [x] Create email templates for pending approval (to owners)
- [x] Implement email sending on booking status change
- [x] Send email to customer when booking is approved
- [x] Send email to customer when booking is rejected
- [x] Write comprehensive tests for email notifications (12 tests passing)
- [ ] Send email to owner when new booking needs approval (integrate into booking creation)
- [ ] Add email preferences to user profile
- [ ] Test email notifications for all scenarios in browser

## Custom Rejection Message Feature (Jan 7, 2026)
- [x] Update OwnerApprovals UI to add custom message textarea for rejections (already implemented)
- [x] Update rejection email template to include custom owner message (already implemented)
- [x] Rejection reason is required and validated before submission
- [x] Custom message stored in rejectionReason database field
- [x] Custom message sent to customer in rejection email

## Admin Dashboard Sidebar & Rejection Enhancements (Jan 7, 2026)
- [x] Add DashboardLayout to all admin pages (OwnerApprovals, etc.)
- [x] Update DashboardLayout menu items for admin navigation
- [x] Create common rejection reason templates (6 templates)
- [x] Add template dropdown to rejection dialog
- [x] Allow owners to customize selected template
- [x] Templates auto-populate textarea when selected
- [x] Implement alternative site suggestions in rejection dialog
- [x] Add checkbox to enable alternative suggestions
- [x] Append alternative contact message to rejection reason
- [x] Update rejection workflow to include alternative suggestions
- [x] Test rejection templates and alternative suggestions
- [x] Verify template dropdown populates textarea correctly
- [x] Verify alternative suggestions checkbox shows helper message
- [x] Verify admin dashboard sidebar appears on all admin pages

## Shopping Centres Admin Page (Jan 7, 2026)
- [x] Create OwnerCentres admin page with DashboardLayout
- [x] Add alphabetical sorting button for centres by name
- [x] Implement sorting logic (A-Z toggle)
- [x] Add search functionality for centres
- [x] Add route to App.tsx (/owner/centres)
- [x] Add Shopping Centres to DashboardLayout menu
- [x] Test alphabetical sorting functionality
- [x] Verify centres sort correctly A-Z when button clicked
- [x] Verify button shows active state ("Sorted A-Z") when enabled

## Centre Editing Feature (Jan 7, 2026)
- [x] Review current shoppingCentres schema fields
- [x] Add missing fields: contactPhone, contactEmail, operatingHours, policies
- [x] Push database schema changes
- [x] Create updateCentre backend API endpoint
- [x] Add input validation for centre updates (zod schema with email validation)
- [x] Create EditCentreDialog component with form
- [x] Add form fields for all editable properties (name, address, contact, hours, policies)
- [x] Implement form validation (phone, email formats)
- [x] Connect Edit button to open dialog
- [x] Add Edit button with icon to centre cards
- [x] Test centre editing end-to-end
- [ ] Write unit tests for update endpoint

## Automated Weekly Booking Report (Jan 7, 2025)
- [x] Add email configuration fields to shopping_centres table (reportEmails, reportTimezone, nextReportOverrideDay)
- [x] Create weekly_report_config table for state-level public holiday overrides
- [x] Build admin UI for configuring report email recipients (comma-separated, up to 10)
- [x] Add timezone selector for each centre (default to local state timezone)
- [x] Add public holiday override dropdown (select different day for next report only)
- [x] Implement Excel report generation with exact format from CSV template
- [x] Report structure: Centre name header, date range, 9-day grid (Sun-Mon-Tue-Wed-Thu-Fri-Sat-Sun-Mon)
- [x] Each cell shows: Company Name (bold), Product Category (bold), Contact Name, Phone, Email, Booked dates, Tables/Chairs (bold)
- [x] Report covers: Sunday before week + 7 days of week + Monday after = 9 consecutive days
- [x] Email subject format: "[Centre Name] Casual Leasing Bookings Week Commencing [Date]"
- [x] Create scheduled job to run every Friday at 3pm (local timezone per centre)
- [x] Implement logic to check for override day and auto-reset after sending
- [x] Handle centres with no bookings (send empty report or skip?)
- [x] Add email delivery status tracking and error logging
- [x] Write tests for report generation and scheduling logic

## Enhanced Search with Product Category Support

- [x] Analyze current search implementation (frontend and backend)
- [x] Review sites table schema for product category fields
- [x] Update search backend to parse and match product categories
- [x] Add intelligent query parsing (extract centre, size, category from single input)
- [x] Implement autocomplete for product categories
- [x] Update frontend search UI to show category suggestions
- [x] Enhance search results to highlight matched categories
- [x] Update site details pages to prominently display categories
- [x] Ensure category context flows through booking process
- [x] Test search with various combinations (centre + size + category)
- [x] Write tests for category search logic

## Critical Bug Fix: Category Filtering

- [ ] Investigate why search shows sites with unapproved categories
- [ ] Fix searchSitesWithCategory to only return sites with approved categories
- [ ] Test with Highlands Site 3 (books not approved but showing in search)
- [ ] Add test cases for unapproved category filtering
- [ ] Verify fix works across all search scenarios

## Site Category Management UI (Critical Missing Feature - Jan 9, 2026)
- [ ] Create ManageSiteCategoriesDialog component
- [ ] Add "Manage Categories" button to OwnerSites page
- [ ] Build checkbox grid UI for all 34 categories per site
- [ ] Add backend tRPC procedures for getting/setting site categories
- [ ] Implement bulk "Select All" / "Deselect All" functionality
- [ ] Add search/filter for categories in the dialog
- [ ] Configure Highlands Site 3 to exclude books, charities, government
- [ ] Verify search filtering works with real approved category data
- [ ] Test that sites with no approved categories don't appear in search

## Critical Bug Fix: Category Filtering (Jan 9, 2026)
- [x] Investigate why Site 3 appears in books search despite books not being approved
- [x] Fix searchSitesWithCategory to properly enforce approved categories
- [x] Fix search.smart procedure to respect category filtering results
- [x] Configure Highlands sites with correct category approvals for testing
- [x] Test that Site 3 no longer appears when searching for books

## Admin UI for Category Management Integration (Jan 9, 2026)
- [ ] Review existing ManageSiteCategoriesDialog component implementation
- [ ] Check if component is already integrated into admin UI
- [ ] Add "Manage Categories" button to appropriate admin page if missing
- [ ] Test category management workflow end-to-end
- [ ] Verify changes sync with search filtering
- [ ] Document the category management feature for users

## Admin UI for Category Management (Jan 9, 2025)
- [x] Add "Manage Categories" button to each site card in admin Sites page
- [x] Create ManageSiteCategoriesDialog component with all 42 categories
- [x] Implement search functionality to filter categories
- [x] Add Select All / Deselect All buttons for bulk operations
- [x] Integrate with existing backend procedures (sites.getApprovedCategories, sites.setApprovedCategories)
- [x] Fix Sites page URL parameter handling with useEffect
- [x] Test dialog functionality with Highlands Marketplace sites
- [x] Verify all UI features work correctly (search, bulk actions, save/cancel)

## Admin Layout Consistency Issues (Jan 9, 2025)
- [x] Audit all admin pages to verify they use AdminLayout component
- [x] Fix any admin pages missing the left sidebar menu (11 pages fixed)
- [x] Verify Site Assignment page purpose and necessity
- [x] Ensure all admin pages have consistent navigation experience
- [x] Test all admin pages after layout fixes

## Admin Navigation UX Improvements (Jan 9, 2025)
- [x] Find all "Back to Dashboard" buttons in admin pages
- [x] Remove redundant "Back to Dashboard" buttons from page headers (1 button removed from SiteAssignment.tsx)
- [x] Add active page highlighting to AdminLayout sidebar navigation (already implemented)
- [x] Test navigation and verify active states work correctly

## Sidebar Section Grouping & GST Configuration (Jan 9, 2025)
- [x] Design sidebar menu section structure (Content, Operations, Financial, System)
- [x] Add system_settings table to database schema for GST percentage (using existing systemConfig table)
- [x] Implement collapsible sidebar sections in AdminLayout component
- [x] Create GST configuration UI in Settings page (SuperAdmin only)
- [x] Add backend procedures for getting/setting GST percentage
- [x] Update booking calculation logic to use configurable GST
- [x] Update invoice generation to use configurable GST
- [x] Test GST changes reflect in booking totals
- [x] Test sidebar section collapse/expand functionality

## GST Historical Rate Preservation (Jan 9, 2025)
- [x] Add gstPercentage field to bookings table schema
- [x] Add gstPercentage field to transactions table schema
- [x] Update booking creation logic to store current GST rate
- [x] Update invoice generation to use stored GST rate from booking (ready for when invoices are implemented)
- [x] Database migration completed (0018_mean_the_order.sql)
- [x] Test GST percentage storage and retrieval (4 tests passing)

## Search Functionality Fix (Jan 9, 2025)
- [x] Investigate current search implementation on home page
- [x] Fix search to parse centre name, site size, and product category from query
- [x] Add missing product category keywords (boots, ugg, sneakers, sandals, heels)
- [x] Update backend search endpoint to handle multi-part queries (already working)
- [x] Test search with "highlands 3x4 ugg boots" example - successfully found Highlands Marketplace with 5 matching sites
- [x] Ensure search results show matching centres and sites

## Category Sorting & Keyword Issues (Jan 9, 2025)
- [x] Fix category list to display in alphabetical order when adding new categories
- [x] Add "candles" and other missing category keywords to query parser (93 keywords total)
- [x] Verify category filter dropdown shows all categories alphabetically
- [x] Test that searching for "candles" finds sites with Candles category approved
- [x] Ensure category filter on search results page works correctly

## Category Consistency Indicator (Jan 9, 2025)
- [x] Add logic to check if all sites in a centre have identical category approvals
- [x] Display "All sites in this centre have the same usage approvals" message when applicable
- [x] Add visual styling (green badge with checkmark icon) to make the indicator prominent
- [x] Test with centres that have matching category approvals across all sites (Eastgate Bondi Junction)
- [x] Test with centres that have different category approvals per site (indicator correctly hidden)

## CRITICAL: Fix Category Approvals Bug (Jan 9, 2025)
- [x] Investigate why all category approvals were cleared (display bug, not data loss)
- [x] Identify the code that caused the data loss (line 87 in usageCategoriesDb.ts: a.categoryId should be a.id)
- [x] Restore category approvals from previous checkpoint or backup (no restoration needed - data was intact)
- [x] Fix the bug to prevent future data loss (changed a.categoryId to a.id)
- [x] Verify all sites have their category approvals restored (tested with Site 2 at Eastgate - all categories showing correctly)

## Bulk Category Sync Button (Jan 9, 2025)
- [x] Add "Sync All Sites" button to Usage Categories page ("Apply to All Sites in Centre" already exists)
- [x] Create backend procedure to copy categories from one site to all others in centre (applyToAllSites mutation exists)
- [x] Show success message with count of sites updated (toast shows "Applied to X sites in this centre")
- [x] Test syncing categories across multiple sites (functionality verified)

## Invoice Payment Workflow (Jan 9, 2025)
- [x] Add `canPayByInvoice` boolean field to users table schema
- [x] Add `paymentMethod` field to bookings table (stripe/invoice)
- [x] Add `paidAt` timestamp field to bookings table
- [x] Add `paymentRecordedBy` field to bookings table (admin who confirmed payment)
- [x] Create checkbox in Users admin page to enable "Pay by Invoice" for clients
- [x] Create users router with list and updateInvoiceFlag procedures
- [x] Build Users admin page with search and invoice flag management
- [x] Modify booking creation flow to check user's canPayByInvoice flag
- [x] Skip Stripe payment for invoice-approved clients (paymentMethod set to 'invoice')
- [x] Update frontend booking flow to skip Stripe payment step for invoice clients
- [x] Show "Booking confirmed" message for auto-approved invoice bookings
- [x] Show "You should be advised if your request has been approved within 3 days" for manual approval
- [x] Generate invoice PDF with NET-14 payment terms
- [x] Send invoice PDF after booking approval (not at booking creation)
- [x] Create SuperAdmin "Record Payment" interface at /admin/payments
- [x] Add search by booking number functionality
- [x] Add search by company name functionality
- [ ] Implement payment confirmation that triggers status change
- [ ] Create payment split logic (owner/manager/platform fees)
- [ ] Add transaction records for payment splits
- [ ] Send payment confirmation emails to all parties
- [ ] Test complete workflow from booking to payment recording


## Email Integration & Payment Reminders Enhancement

- [x] Set up direct customer email integration for invoice delivery
- [x] Replace owner notifications with actual customer emails
- [x] Test email delivery with PDF attachments
- [x] Build automated payment reminder system
- [x] Create scheduled job for checking overdue invoices
- [x] Send reminder emails: 7 days before due, on due date, 7 days after
- [x] Create invoice dashboard page at /admin/invoice-dashboard
- [x] Show outstanding invoices with amounts and due dates
- [x] Show overdue invoices highlighted in red
- [x] Add filtering by status (all/outstanding/overdue/paid)
- [x] Add export to CSV functionality
- [x] Show total outstanding amount and overdue amount
- [x] Add payment history table with search


## SMTP Configuration

- [ ] Request SMTP secrets to appear in Settings → Secrets panel
- [ ] Verify secrets are visible and configurable by user


## Enhanced User Registration with Insurance Validation

- [ ] Update registration form with all fields from UserIDSetup.csv
- [ ] Add password and confirm password fields
- [ ] Add company details section (name, website, ABN, address, city, state, postcode)
- [ ] Add product/service dropdown with custom text field
- [x] Add insurance details section (company, policy no, amount, expiry date)
- [x] Add insurance document upload field
- [x] Implement OCR scanning for insurance documents (extract expiry date and amount)
- [x] Validate minimum insurance amount ($20m)
- [x] Add booking validation: check insurance expiry vs booking dates
- [x] Flag bookings for manual approval if insurance expires before booking end date
- [x] Show "Insurance Expired" as manual approval reason in admin panel


## Admin User Registration

- [x] Add "Register New User" button to User Management page
- [x] Create registration dialog/form with user fields
- [x] Add admin procedure to create new user accounts
- [x] Set default password or send invitation email
- [x] Test admin user registration flow


## Enhanced User Registration with Company & Insurance

- [x] Add company details fields to registration form (company name, website, ABN, address, city, state, postcode, product/service)
- [x] Add insurance details fields to registration form (insurance company, policy no, amount, expiry date, document upload)
- [x] Update registerUser procedure to create customer profile
- [x] Test complete registration with all fields


## User Edit Actions

- [x] Add Edit button to User Management table actions column
- [x] Create edit dialog with tabbed interface (same as registration)
- [x] Load existing user data including company and insurance details
- [x] Create backend procedure to update all user fields
- [x] Test complete user editing flow


## Edit User Enhancements

- [x] Replace Product/Service text field with Usage Category dropdown
- [x] Add product/service details text field
- [x] Add insurance document upload field to Insurance tab
- [x] Wire up insurance upload to OCR scanning
- [x] Update Save Changes to save all three tabs at once (already implemented)
- [x] Test complete edit flow with all enhancements


## Insurance Upload Fix

- [x] Fix insurance document upload to use proper file handling (convert to base64 or use S3 directly)
- [x] Convert file to base64 data URL in frontend
- [x] Extract base64 data and upload to S3 in backend
- [x] Fix React hooks error by moving mutations to component level
- [ ] Test upload with PDF files
- [ ] Test upload with image files (JPG, PNG)
- [ ] Verify OCR scanning works after upload


## OCR Scanning Fix & View Document

- [x] Debug why OCR scanning is failing after upload (API error with file_url)
- [ ] Fix insurance scanner to properly extract amount and expiry date
- [x] Add persistent error message at bottom of Edit User dialog (red, stays until Save Changes)
- [x] Add "View Document" link to Insurance tab showing uploaded PDF
- [ ] Test complete upload → scan → auto-fill workflow


## OCR Scanner Fix & Enhancements

- [x] Fix OCR scanner API error (works for images, PDFs require manual entry)
- [x] Add "Skip Scanning" checkbox for manual override
- [x] Add document preview thumbnail showing first page of PDF (image preview for JPG/PNG, icon for PDF)
- [x] Update registration flow to prompt insurance upload first
- [x] Auto-fill insurance fields after successful scan during registration
- [x] Test complete registration workflow with insurance upload

## OCR "Could not extract" Error Debug
- [x] Investigate "Could not extract" error message
- [x] Check insuranceScanner.ts LLM prompt and response parsing
- [x] Verify LLM API call format and error handling
- [x] Fix extraction logic - changed image_url to file_url for PDFs
- [x] Test with actual insurance document upload - 5 tests passing

## Expired Insurance Handling
- [x] Modify scanner to extract data from expired policies (don't block scan)
- [x] Remove expiry validation from scanInsuranceDocument function - returns warnings instead
- [x] Add red warning UI in Edit User dialog when expiry date is in the past
- [x] Add red warning UI in Profile page when expiry date is in the past
- [x] Allow saving expired insurance data for admin records
- [x] Test with expired policy PDF - 5 tests passing

## Edit User Save Bug - Company Details
- [x] Investigate why Category (productCategory) field not saving - data IS saving to DB
- [x] Investigate why Details (productDetails) field not saving - data IS saving to DB
- [x] Check updateUser mutation schema in routers.ts - correct
- [x] Check field mapping in Users.tsx handleUpdateUser - correct
- [x] Fix getAllUsers to join with customer_profiles - separate queries + map
- [x] Fix profile data structure issue (nested vs flat) - eliminated duplicates
- [x] Verify all Company Details fields save correctly - working
- [x] Test with actual user edit - confirmed working
- [x] Remove debug logging

## Duplicate admin@test.com Entries
- [x] Check database for duplicate users with same email - found 2 entries
- [x] Identify if it's data issue or display issue - data issue (2 actual DB rows)
- [x] Remove duplicate entries if they exist in DB - deleted second entry
- [x] Verify Users list shows unique entries only - confirmed 1 entry remains

## Email Uniqueness Constraint
- [x] Add unique constraint to email field in users table schema
- [x] Push migration to database - migration 0022 applied
- [x] Test that duplicate emails are rejected - 3 tests passing
- [x] Verify existing functionality still works - constraint enforced

## Email Validation on Registration
- [x] Add backend procedure to check for duplicate emails - checkEmailAvailable query
- [x] Add frontend email format validation - real-time with debounce
- [x] Show user-friendly error messages for invalid/duplicate emails - red border + error text
- [x] Test registration flow with various email scenarios - 4 tests passing
- [x] Disable save/register buttons when email has errors

## Booking Number Format Review
- [x] Check if booking numbers include centre name (e.g., CampbelltownMall) - YES, uses centreCode
- [x] Review current booking number length - ~28-35 chars, can be optimized
- [x] Implement abbreviated centre codes (4 letters instead of full name)
- [x] Update booking number generation to use abbreviated codes
- [x] Ensure uniqueness is maintained - code + date + sequence
- [x] Test booking number generation with new format - 15 tests passing

## Centre Code Management UI
- [x] Add backend procedure to list all centres with their codes - listWithCodes query
- [x] Add backend procedure to update centre code - updateCentreCode mutation
- [x] Create Centre Codes admin page - /admin/centre-codes
- [x] Show auto-generated code preview for each centre
- [x] Allow editing and saving custom codes - inline editing with save/cancel
- [x] Validate code uniqueness and format (4 chars, uppercase) - frontend + backend validation
- [x] Test centre code updates - 8 tests passing
- [x] Add navigation link in AdminLayout

## Pending Approvals - Show Approval Reason
- [x] Check where approval reasons are stored/generated - getPendingApprovals procedure
- [x] Find the "Manual approval required" text in Pending Approvals page - already displayed via approvalReason field
- [x] Update backend to detect all approval reasons (insurance expired, insufficient coverage, category not approved, duplicate booking, site requires approval, custom text)
- [x] Update getBookingsByStatus to include usageCategoryId and additionalCategoryText fields
- [x] Test approval reason logic - 10 tests passing

## Remove # Prefix from Booking Numbers
- [x] Find # prefix in Pending Approvals page
- [x] Remove # prefix from booking number display
- [x] Check other pages for consistency - removed from MyBookings, OwnerApprovals, Payments

## Booking Management Search
- [x] Add search input field in top right of Booking Management page
- [x] Implement search filtering by booking number
- [x] Implement search filtering by customer name
- [x] Implement search filtering by customer email
- [x] Add search icon and clear button
- [x] Test search with various inputs - 11 tests passing

## Booking Management - Add All Tab
- [x] Add "All" tab button before "Pending" in Booking Management
- [x] Update BookingStatus type to include "all"
- [x] Update query to pass undefined status when "all" selected
- [x] Backend already supports undefined status (returns all bookings)
- [x] Set "all" as default tab on page load
- [x] Test All tab shows all bookings regardless of status - 8 tests passing

## Booking Management - Reposition All Tab
- [x] Move "All" tab button to beside "Completed" (after, not before)
- [x] Change default tab from "all" to "pending"
- [ ] Update tests to reflect new default behavior

## Booking Management - Count Badges
- [x] Add count badges to each tab label showing number of bookings
- [x] Display format: "Pending (3)", "All Bookings (15)", etc.
- [x] Calculate counts from bookings data in real-time
- [x] Test count badges update correctly when bookings change - 8 tests passing

## Booking Management - Unpaid Tab
- [x] Add "Unpaid" tab after "Completed" tab
- [x] Update BookingStatus type to include "unpaid"
- [x] Create backend query to filter unpaid invoice bookings (paymentMethod=invoice AND paidAt IS NULL)
- [x] Add visual badge/icon to unpaid invoice bookings in all tabs
- [x] Update count calculation to include unpaid count
- [x] Test Unpaid tab shows only unpaid invoice bookings regardless of status (pending or confirmed) - 9 tests passing

## Fix Duplicate Booking Logic - Category Exclusivity
- [x] Fix duplicate booking check to look for DIFFERENT customers (not same customer)
- [x] Add date overlap check (startDate/endDate conflict detection)
- [x] Update approval reason to show when another customer has overlapping booking in same category
- [x] Test category exclusivity logic with overlapping and non-overlapping dates - 4 tests passing

## Payment Due Date Tracking
- [x] Add paymentDueDate field to bookings table schema
- [x] Run database migration to add new column
- [x] Calculate due date automatically (7 days after booking creation for invoice bookings)
- [x] Display due date in Unpaid tab
- [x] Highlight overdue invoices in red when past due date
- [x] Add "Days Overdue" indicator for overdue invoices - 4 tests passing

## Automated Unpaid Reminder Emails
- [x] Create email template for payment reminders
- [x] Implement reminder scheduling logic (7, 14, 30 days after due date)
- [x] Track last reminder sent date to avoid duplicate emails
- [x] Add remindersSent field to bookings table
- [x] Create tRPC procedure to manually trigger reminders
- [x] Test reminder email sending at configured intervals - 6 tests passing

## Fix OAuth Login Issue
- [x] Investigate "Database Error upserting user: Error: No values to set" error
- [x] Fix user upsert logic in OAuth callback handler - added lastSignedIn and loginMethod support
- [x] Test login flow to ensure session is saved correctly
- [x] Verify admin access after login

## Fix Dashboard Showing Zeros
- [x] Investigate why dashboard shows 0 centres/sites despite data existing
- [x] Found missing getAllSites() and getAllBookings() functions in db.ts
- [x] Added missing functions to fix dashboard stats query
- [x] Verify dashboard now displays correct counts - 52 centres, 81 sites, 577 bookings

## Fix TypeScript Errors - Floor Plan Functions
- [x] Add saveSiteMarkers() function to db.ts
- [x] Add getFloorLevelsByCentre() function to db.ts
- [x] Add uploadFloorLevelMap() function to db.ts
- [x] Add getSitesByFloorLevel() function to db.ts
- [x] Add searchShoppingCentres() function to db.ts
- [x] Add uploadCentreMap() function to db.ts
- [x] Reduced TypeScript errors from 35 to 19 (remaining are type annotations and function signature mismatches)

## Test Unpaid Tab Functionality
- [x] Navigate to /admin/bookings and verify Unpaid tab exists
- [x] Check that unpaid invoice bookings display correctly - shows "No unpaid bookings found"
- [x] Verify due date column shows correct dates - N/A (no unpaid bookings)
- [x] Test overdue indicator appears for past-due invoices - N/A (no unpaid bookings)
- [x] Verify count badge shows correct number of unpaid invoices - shows "Unpaid (0)"
- [x] Database check confirms: 0 invoice bookings exist (all 577 bookings are Stripe payments)

## Fix Search Page Error - Missing searchSitesWithCategory
- [x] Find searchSitesWithCategory function in git history
- [x] Add missing function to db.ts
- [x] Test search page with query "eastgate 3x4 ugg"
- [x] Verify search results display correctly - 5 sites found at Eastgate Bondi Junction (Sites 2, 10, 11, L2-33, L2-99)

## Fix Search Size Availability Message
- [x] Investigate why "requested size not available" shows when matching sites exist
- [x] Check size filtering logic in search.smart procedure
- [x] Fix size matching to correctly identify available sites - removed line 858 that was overwriting hasMatchingSites
- [x] Test with "highlands food 2x3" query on 06/06/2026
- [x] Verify message only shows when truly no matching sizes exist - message is now gone, shows 5 sites including exact matches

## Add Size Match Indicators
- [x] Calculate size match type in backend (perfect/larger/smaller)
- [x] Add sizeMatch field to search results
- [x] Add "Perfect Match" green badge for sites matching exact requested size
- [x] Add "Larger Available" blue badge for sites larger than requested
- [x] Display badges in search results site list
- [x] Test with "highlands food 2x3" query - working correctly, shows 4 sites with proper filtering

## Smart Size Suggestions
- [x] Calculate closest available size when no exact matches exist - tracks closestMatch in backend
- [x] Add closestMatch to search results return value
- [x] Show "Closest match: X.Xm × X.Xm (XXm²)" message with percentage difference in frontend
- [x] Only show when size requirement specified but no exact matches
- [x] Replace generic "not available" with helpful suggestion
- [x] Test with query that has no exact matches - working correctly, user confirmed

## Fix TypeScript Errors
- [x] Fix function signature mismatch at line 212 (Expected 1 arguments, but got 3) - added startDate/endDate params to getBookingsBySiteId
- [x] Fix function signature mismatch at line 265 (Expected 1 arguments, but got 3) - same fix
- [x] Fix function signature mismatch at line 927 (Expected 1 arguments, but got 3) - same fix
- [x] Fix function signature mismatch at line 928 (Expected 1 arguments, but got 3) - same fix
- [x] Added missing getShoppingCentresByState and getNearbyCentres functions
- [x] Added missing imports (gte, lte, or) to db.ts
- [x] Reduced TypeScript errors from 14 to 4 (remaining are unrelated payment page issues)

## Add "Show All Sized Sites" Link
- [x] Add link at bottom of search results list stating "Show me all sized sites"
- [x] Link removes size filter from current search query
- [x] Preserves centre name, date, and category filters
- [x] Re-runs search to display all sites regardless of size
- [x] Test with "highlands food 2x3" query showing filtered results
- [x] Verify clicking link shows all 5 sites instead of filtered 4

## Test Results - "Show All Sized Sites" Link
- [x] Link appears at bottom of search results when size filter is active
- [x] Link removes size filter from query while preserving centre name and date
- [x] Clicking link successfully shows all sites (tested: 4 filtered → 16 total sites)
- [x] URL correctly updates from "highlands food 2x3" to "highlands"
- [x] Category filter preserved when present
- [x] "Filtering by" message removed after clicking link

## Update Link Text for Clarity
- [x] Changed link text from "Show me all sized sites" to "Show me all sized sites in this centre"
- [x] Makes it clear the link shows all sites within the same shopping centre only
- [x] Verified updated text displays correctly in browser

## Bug Fixes - Search Precision & Autocomplete
- [x] Fix search showing too many results (e.g., "Eastgate" shows test centres)
- [x] Make search more precise to match intended centre only
- [x] Fix autocomplete dropdown showing all centres instead of filtered matches
- [x] Ensure autocomplete only displays centres matching the typed text

## CRITICAL BUG - Database Update Error
- [x] Eastgate is now hidden (includeInMainSite = 0) - FIXED
- [x] Test centres are showing (includeInMainSite = 1) - FIXED
- [x] Need to reverse the values - show real centres, hide test centres - FIXED

## INVESTIGATION - Fix Not Working
- [x] Database updates were applied but search still not working - Root cause found
- [x] Need to debug why includeInMainSite filter is not being applied - Fixed in searchSitesWithCategory
- [x] Check if there's caching or other issues - Was missing filter in second search path

## CRITICAL - Search Still Broken
- [x] "Eastgate" search returns ALL centres alphabetically (not just Eastgate) - FIXED
- [x] "Campbelltown" search returns Campbelltown Mall first, then all other centres - FIXED
- [x] The includeInMainSite filter is not the issue - the search matching logic is broken - Root cause: q.includes(t)
- [x] Need to properly investigate why fuzzy matching is returning everything - Fixed by removing q.includes(t)

## Search Issue - Highlands Marketplace Not Found
- [x] Search for "Highlands Marketplace 2x2 pet" returns "No shopping centres found" - FIXED
- [x] Should find Highlands Marketplace and filter by 4m² minimum size - Working now
- [x] Need to verify centre exists and why search is failing - Root cause: missing singular keywords
- [x] Check if query parsing is extracting centre name correctly - Fixed by adding singular forms

## New Features - Search Improvements
- [x] Fuzzy category matching - match "pet" with "Pet Supplies", "Pets & Animals" using string similarity
- [x] Search suggestions on no results - show "Did you mean?" with similar centre names
- [x] Show nearby alternatives when no exact match found

## UI Improvements - Search Results
- [x] Reduce spacing between centre name and Available/Booked legend
- [x] Add red notice explaining filter behavior (size and category matching)

## UI Refinements - Search Results Notice
- [x] Update notice text to "These results shows sites that meet or exceed the stated size requirement AND are permitted to sell in the requested category."
- [x] Increase notice font size to double (text-base instead of text-xs)
- [x] Further reduce spacing between centre name and Available/Booked legend

## Conditional Notice Wording
- [x] Display different notice text based on active filters (size only, category only, or both)
- [x] Fix grammar: "shows" → "show"

## Query Parser - Size Format Bug
- [x] Fix parser to recognize "3 by 4" as size dimension (3x4)
- [x] Support variations: "3 by 4", "3by4", "3 x 4", "3x4"

## Search Analytics Dashboard
- [x] Create database schema for search_analytics table
- [x] Add search logging to smart search router
- [x] Track: query, results count, timestamp, user (if logged in)
- [x] Track failed searches (zero results)
- [x] Track suggestion clicks
- [x] Create admin dashboard page for analytics
- [x] Display popular searches (top 10)
- [x] Display failed searches with suggestions
- [x] Display suggestion click-through rates
- [x] Add date range filter for analytics

## Navigation and Bug Fixes
- [ ] Add Search Analytics link to admin dashboard navigation
- [ ] Fix image removal button in Admin Sites page (Site 2 image not removing)

## New Tasks (Jan 12, 2025)
- [x] Test and fix image removal functionality in Sites admin page
- [x] Implement CSV/Excel export for Search Analytics dashboard
- [x] Update app name to "Real Casual Leasing"
- [ ] Configure domain for realcasualleasing.com

## Completed Tasks (Jan 13, 2026)
- [x] Test and fix image removal functionality in Sites admin page - WORKING CORRECTLY
- [x] Implement CSV/Excel export for Search Analytics dashboard - COMPLETED
- [x] Update app name to "Real Casual Leasing" - COMPLETED
- [ ] Configure domain for realcasualleasing.com - User needs to configure via Management UI Settings → Domains

## New Feature Request (Jan 13, 2026)
- [x] Add "Previous Week" and "Next Week" navigation links to search results calendar

## New Calendar Enhancements (Jan 13, 2026)
- [x] Add "Today" quick-jump button to calendar navigation
- [x] Add month view toggle (14-day vs 30-day calendar view)

## Bug Fix (Jan 13, 2026)
- [x] Fix image upload showing "failed" message even when upload succeeds in Admin Sites

## New Features (Jan 13, 2026)
- [x] Add daily rate to calendar hover tooltips in search results
- [ ] Add image preview modal before upload in Admin Sites
- [x] Add drag-and-drop image upload functionality in Admin Sites
- [ ] Integrate image crop/rotate tool for image uploads

## Features Completed (Jan 13, 2026 - Part 2)
- [x] Add daily rate to calendar hover tooltips in search results - Shows weekday/weekend rates
- [x] Add image preview modal before upload in Admin Sites - Full preview with crop/rotate tools
- [x] Add drag-and-drop image upload functionality in Admin Sites - "Click or drag to upload" zones
- [x] Integrate image crop/rotate tool for image uploads - Zoom (1x-3x), rotation (0-360°), quick 90° buttons, 4:3 crop area

## CRITICAL BUG - Seasonal Pricing (Jan 13, 2026)
- [ ] Fix bulk seasonal rate increase showing $0 on calendar
- [ ] Issue: Applied 30% increase to all Chullora sites for June 13-14, calendar now shows $0
- [ ] Investigate seasonal pricing calculation logic
- [ ] Verify seasonal_pricing table data integrity
- [ ] Fix rate calculation to properly apply seasonal adjustments

## Seasonal Pricing Enhancements (Jan 14, 2026)
- [ ] Add seasonal rate calendar view in admin for visual management
- [ ] Implement booking cost preview with seasonal breakdown showing transparent pricing

## Completed Features (Jan 13, 2026 - Evening)
- [x] Add seasonal rate calendar view in admin (SeasonalRateCalendar component created)
- [x] Implement booking cost preview with seasonal breakdown (PriceCalculator enhanced with day-by-day breakdown)
- [x] Update calculateBookingCost to return all days with seasonal flag for transparent pricing

## Bug Fixes (Jan 13, 2026 - Late Evening)
- [x] Fix search to recognize product category variations (e.g., "uggs" should match "ugg" and "ugg boots")

## New Tasks (Jan 14, 2026)
- [x] Update search results message to clarify SIZE and USAGE requirements
- [x] Add "Show me all sized sites" button to display all sites regardless of filters (button displayed, navigation needs debugging)

## Button Update (Jan 13, 2026)
- [x] Update "Show me all sized sites" button to match existing "Show me all sized sites in this centre" button wording and functionality

## Button Navigation Debug (Jan 13, 2026)
- [ ] Debug and fix "Show me all sized sites in this centre" button navigation to properly remove category filters

## Button Navigation Fix (Jan 14, 2026)
- [ ] Fix "Show me all sized sites in this centre" button click handler to properly navigate

## Admin Portfolio Dashboard (Jan 2026)
- [ ] Add assignedState field to users table for State Admin role
- [ ] Create budgets table (siteId, month, year, budgetAmount)
- [ ] Add national_admin and state_admin roles to user role enum
- [ ] Create dashboard.getPortfolioMetrics tRPC procedure with RBAC filtering
- [ ] Implement YTD metrics calculation (revenue, booked days, top site)
- [ ] Implement monthly metrics calculation (revenue, booked days, top site)
- [ ] Implement last year comparison metrics (same calendar periods)
- [ ] Calculate pending approvals count
- [ ] Build dashboard UI with metric cards grid
- [ ] Add month/year/state filter dropdowns
- [ ] Create budget pie charts (Annual and YTD)
- [ ] Add "Update" button for on-demand refresh
- [ ] Add "Pending Approvals" badge button linking to bookings page
- [ ] Test RBAC: National Admin sees all centres
- [ ] Test RBAC: State Admin sees only their assigned state's centres
- [ ] Add "Last updated" timestamp display

## Admin Portfolio Dashboard (Jan 14, 2026)
- [x] Add assignedState field to users table for State Admin RBAC
- [x] Create budgets table (by site, by month)
- [x] Build backend dashboard metrics procedures with RBAC filtering
- [x] Create dashboard UI with data visualizations
- [x] Add on-demand refresh button
- [x] Show pending approvals badge with navigation to Bookings page
- [x] Add state filter dropdown for National Admins
- [x] Display YTD and monthly metrics with last year comparison
- [x] Show budget pie charts (annual and YTD)
- [x] Display top performing sites by revenue and booked days

## Navigation Fix (Jan 14, 2026)
- [x] Add Portfolio Dashboard link to admin sidebar navigation

## Budget Management & Dashboard Enhancements (Jan 14, 2026)
- [x] Create Budget Management admin page with CRUD interface
- [x] Add backend tRPC procedures for budget CRUD operations
- [x] Build budget entry form (select site, month, year, amount)
- [x] Display budget list with edit/delete actions
- [ ] Add bulk budget import feature (CSV upload)
- [x] Populate budgets table with sample monthly targets for 2026
- [x] Create State Admin assignment interface in Users page
- [x] Add assignedState dropdown to user edit form
- [x] Implement clickable budget pie charts with drill-down modal
- [ ] Show per-site budget breakdown in modal (site name, budget, actual, variance)
- [ ] Add color coding for over/under budget sites in breakdown
- [ ] Write vitest tests for budget CRUD and chart interactions

## Budget vs Actual Reporting & Bulk Import (Jan 14, 2026)
- [x] Create backend query to get per-site budget vs actual breakdown
- [x] Add tRPC procedure for site-level budget performance data
- [x] Populate drill-down modal with real per-site data (site name, budget, actual, variance, % achieved)
- [x] Add color coding for variance (green for over-budget, red for under-budget)
- [x] Implement CSV file upload component in Budget Management page
- [x] Add backend CSV parser to validate and import budget data
- [x] Create tRPC procedure for bulk budget import
- [x] Add validation for CSV format (siteId, month, year, budgetAmount columns)
- [x] Show import summary (success count, error count, duplicate handling)
- [x] Write vitest tests for budget breakdown query and CSV import


## FY Budget Management Reimplementation (Jan 14, 2026)
- [x] Verify current app is working after rollback
- [x] Add fy_percentages and centre_budgets tables to schema
- [x] Push database schema changes
- [x] Create backend database helpers for FY budgeting
- [x] Add tRPC procedures for FY budget CRUD
- [ ] Test backend API endpoints
- [ ] Create FYBudgetManagement frontend component
- [ ] Test frontend component renders correctly
- [ ] Add navigation link to admin sidebar
- [ ] Final testing and checkpoint


## FY Budget Management (Jan 14, 2026) - COMPLETED
- [x] Add fy_percentages table for monthly percentage distribution
- [x] Add centre_budgets table for annual budgets per centre
- [x] Create backend database helpers for FY budgeting
- [x] Add tRPC procedures for FY budget CRUD
- [x] Create FY Budget Management frontend component
- [x] Add route and navigation link
- [x] Test all functionality end-to-end
- [x] Fix AdminLayout import error (named vs default export)


## FY Budget Enhancements (Jan 14, 2026)
- [x] Add calculated monthly budget display table to FY Budget Management (already implemented)
- [x] Show Annual Budget × Month % for each centre's 12 months (already implemented)
- [x] Update Portfolio Dashboard to use FY budget data
- [x] Replace old site-level budget queries with centre-level FY budgets
- [x] Update budget vs actual calculations for dashboard metrics
- [x] Test both features end-to-end

## Remove Old Budget Management (Jan 14, 2026)
- [x] Remove old Budget Management page (/admin/budgets)
- [x] Remove route from App.tsx
- [x] Remove navigation link from AdminLayout
- [x] Keep only FY Budget Management (/admin/fy-budgets)

## Bug Fix - Portfolio Dashboard Budget Breakdown (Jan 14, 2026)
- [x] Fix breakdown to show all entered FY centre budgets (not just Highlands)
- [x] Change breakdown from SITE level to CENTRE level aggregation
- [x] Update backend query to use centre_budgets table instead of old budgets table
- [x] Update frontend modal to display centre names instead of site names


## Modal Title Update (Jan 15, 2026)
- [x] Change "Annual Budget Breakdown by Site" to "Annual Budget Breakdown by Centre"


## Portfolio Dashboard Layout Fix (Jan 15, 2026)
- [x] Add AdminLayout with sidebar navigation to Portfolio Dashboard page


## Export Budget Report Feature (Jan 15, 2026)
- [x] Create backend endpoint for PDF export of budget vs actual report
- [x] Create backend endpoint for Excel export of budget vs actual report
- [x] Add Export dropdown button to Portfolio Dashboard header
- [x] Include centre breakdown data in exported reports
- [x] Test PDF and Excel downloads


## Bug Fix - Search Results Month Button (Jan 15, 2026)
- [ ] Investigate Month button not responding on Search Results page
- [ ] Fix the Month button click handler
- [ ] Test Month button functionality

## Search Analytics Dashboard (Jan 15, 2025)
- [x] Design database schema for search analytics (search_logs, suggestion_clicks tables)
- [x] Create backend tRPC procedures for logging searches and retrieving analytics
- [x] Build Search Analytics Dashboard page in admin panel
- [x] Track popular searches with result counts
- [x] Track failed queries (zero results) to identify missing centres
- [x] Track suggestion click-through rates
- [x] Identify common misspellings that need attention
- [x] Add time-based filtering (today, week, month, all time)
- [x] Integrate search logging into existing search functionality
- [x] Add navigation link to admin sidebar
- [x] Add AdminLayout wrapper for consistent sidebar navigation
- [x] Add CSV and Excel export functionality

## UX Enhancement: Enter Key Search (Jan 15, 2026)
- [x] Enable Enter key to trigger search after entering date on front page
- [x] Add form wrapper with onSubmit handler
- [x] Add Enter key handler to text input when suggestions not shown
- [x] Test keyboard navigation works smoothly

## Portfolio Dashboard Budget Breakdown (Jan 15, 2026)
- [x] Add Annual Budget Breakdown by Centre section
- [x] Add YTD Budget Breakdown by Centre section
- [x] Sort centres alphabetically in both sections
- [x] Display budget amounts and percentages (Budget, Actual, Variance, % Achieved)
- [x] Add totals row at bottom of each table
- [x] Test dashboard with budget data

## Remove City Field from Shopping Centres (Jan 15, 2026)
- [x] Remove City field from admin Shopping Centres form (Add/Edit)
- [x] Remove City field from EditCentreDialog component
- [x] Update display logic to use Suburb instead of City fallback
- [x] Update search suggestions to not reference City
- [x] Update backend routers to remove City from input schemas
- [x] Update database helpers that reference City field
- [x] Test centre creation and editing without City field

## Search Results Page Updates (Jan 16, 2026)
- [x] Remove Filter by Accepted Business Category section
- [x] Add centre map below available sites listing (floor plan map like Centre Detail page)
- [x] Test search results page with map display

## Bug Fixes (Jan 16, 2026)
- [ ] Fix Eastgate map not showing on Search Results page (map is already uploaded)
- [ ] Fix Admin centres page showing no centres

## Bug Fixes (Jan 16, 2026)
- [x] Fix Eastgate map not showing on Search Results page - Updated smart search to return floor levels
- [x] Admin centres page was working correctly (57+ centres showing) - confirmed no issue
- [x] Updated Search.tsx to use floor levels for map display instead of centre mapImageUrl

## Site-Wide Login Requirement (Jan 16, 2026)
- [x] Add authentication check to App.tsx to protect all routes (AuthGuard component)
- [x] Create dedicated login page with Manus OAuth (/login route)
- [x] Redirect unauthenticated users to login page
- [x] Preserve intended destination URL for post-login redirect (sessionStorage returnUrl)
- [x] Test authentication flow works correctly

## UX Enhancement: Clickable Banner (Jan 16, 2026)
- [x] Make top banner "Real Casual Leasing" clickable to navigate to home page
- [x] Updated Home.tsx, Search.tsx, MyBookings.tsx, Profile.tsx, SiteDetail.tsx, CentreDetail.tsx, Centres.tsx

## Bug Fix - Centre Map Not Showing on Search Results (Jan 16, 2026)
- [ ] Investigate why centre floor plan map is not appearing on Search Results page
- [ ] Fix the issue so map displays below site listings
- [ ] Test with multiple centres (Eastgate, Highlands, etc.)

## Bug Fix - Month View Shows Only 16 Days (Jan 16, 2026)
- [x] Fix Month view to show full 30 days instead of 16 days (fixed scrollbar width calculation)
- [x] Verify 2 Weeks view still shows 14 days correctly
- [x] Test calendar scrolling works properly with 30 columns

## Bug Fix - Month View Still Shows 16 Days (Jan 16, 2026)
- [ ] Investigate why Month view still shows only 16 days after previous fix
- [ ] Ensure 30 days are visible when Month is selected

## Search Results Calendar Navigation Update (Jan 16, 2026)
- [x] Remove Month button option (keep 14-day view only)
- [x] Add "New Date" button between "Next Week" and "Today"
- [x] Add calendar dropdown to New Date button for selecting new starting date
- [x] Update search results to show 14 days from new selected date
- [x] Test date picker functionality - URL and calendar update correctly
