# VS and 3rdL Sites Not Showing on Map - Investigation

## Issue Description
When selecting "Vacant Shops" or "Third Line Income" asset types in search results, the site details appear correctly but the interactive floor plan map shows NO markers for these sites, even though their locations are stored in Admin.

## Observed Behavior
1. Search for "Eastgate" - shows Casual Leasing sites by default
2. Map displays markers for CL sites: 2, 10, 11 (Ground Floor) and L2-3, L2-9 (Mezzanine)
3. Click "Vacant Shops" button
4. Page shows 2 vacant shops: Shop 1 (25.00m², 5x5) and Shop X1 (120.00m², 10m x 12m)
5. **Centre Floor Plan map is blank - NO markers visible**

## Expected Behavior
The map should display markers for Shop 1 and Shop X1 at their stored map coordinates, just like it does for Casual Leasing sites.

## Root Cause (Hypothesis)
The InteractiveMap component in Search.tsx likely filters sites by asset type, but the filtering logic may be:
1. Not passing the correct asset type filter to the map component
2. Using hardcoded asset type values that don't match VS/3rdL
3. Only configured to show "Casual Leasing" sites

## Files to Check
- `/home/ubuntu/casuallease/client/src/pages/Search.tsx` - where InteractiveMap is used
- `/home/ubuntu/casuallease/client/src/components/InteractiveMap.tsx` - the map component itself
- Database: Check if VS and 3rdL sites have valid mapX/mapY coordinates

## Next Steps
1. Read Search.tsx to see how selectedAssetType is passed to InteractiveMap
2. Check if InteractiveMap filters sites by assetType correctly
3. Verify VS and 3rdL sites have map coordinates in the database
4. Fix the filtering logic to include all asset types
