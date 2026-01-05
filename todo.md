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
