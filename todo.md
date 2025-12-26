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
