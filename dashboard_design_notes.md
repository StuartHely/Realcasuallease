# Dashboard Design Analysis

## Layout Structure

### Top Section: YTD & Monthly Metrics Grid
- 2 rows (This Year / Last Year) × 4 columns of metric cards
- Each card shows: Label + Value
- Metrics:
  - YTD All Centres $ (revenue)
  - YTD All Centres # Booked Days
  - YTD Top Site $ (highest revenue site)
  - YTD Top Site Days Booked
  - Month equivalents of above

### Right Side: Filters
- Month dropdown
- Year dropdown  
- State dropdown (for RBAC filtering)

### Bottom Section: Budget Visualizations
- Two pie charts side by side:
  - Annual Budget $ (Actual vs Remaining)
  - YTD Budget $ (YTD Actual vs Remaining)
- Yellow fill shows actual/achieved
- Blue/teal shows remaining budget

### Action Items
- "Pending Approvals" button (navigate to bookings needing approval)
- "Update" button (refresh dashboard data)

## Questions to Clarify

1. **Budget Data**: Where does budget data come from? Is there a budget table per centre/state, or is this manually set?

2. **Top Site Logic**: Should "Top Site $" show the single highest-earning site name + revenue, or just the revenue amount?

3. **Pending Approvals**: Should this show a count badge (e.g., "Pending Approvals (5)") or just be a navigation button?

4. **State Filter**: Should National Admins see "All States" option, or default to showing aggregated data across all states?

5. **Date Range**: YTD = Jan 1 to today. Month = selected month. Last Year = same periods in previous calendar year. Correct?

6. **Revenue Calculation**: Should this be total booking amount, or owner's share (after platform fees)?
