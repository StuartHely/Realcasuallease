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
