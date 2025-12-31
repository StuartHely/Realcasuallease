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
