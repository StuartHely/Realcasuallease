import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as assetDb from "../assetDb";

export const searchRouter = router({
    // Smart search with site-level support
    smart: publicProcedure
      .input(z.object({ query: z.string(), date: z.date() }))
      .query(async ({ input, ctx }) => {
        // Parse query to extract requirements
        const { parseSearchQuery, siteMatchesRequirements } = await import("../../shared/queryParser");
        const parsedQuery = parseSearchQuery(input.query);

        // If asset type is specified (VS or 3rdL), search only that type
        if (parsedQuery.assetType === 'vacant_shop') {
          const searchQuery = parsedQuery.centreName || input.query;
          const centres = await db.searchShoppingCentres(searchQuery, parsedQuery.stateFilter);
          if (centres.length === 0) {
            return { centres: [], sites: [], availability: [], matchedSiteIds: [], assetType: 'vacant_shop', floorLevels: [] };
          }
          const allShops: any[] = [];
          for (const centre of centres) {
            const shops = await assetDb.getVacantShopsByCentre(centre.id);
            allShops.push(...shops.map((s: any) => ({ ...s, centreName: centre.name, assetType: 'vacant_shop' })));
          }
          // Fetch floor levels for the first centre to display floor plan map
          const floorLevels = centres.length > 0 ? await db.getFloorLevelsByCentre(centres[0].id) : [];
          return { centres, sites: allShops, availability: [], matchedSiteIds: [], assetType: 'vacant_shop', floorLevels };
        }
        
        if (parsedQuery.assetType === 'third_line') {
          const searchQuery = parsedQuery.centreName || input.query;
          const centres = await db.searchShoppingCentres(searchQuery, parsedQuery.stateFilter);
          if (centres.length === 0) {
            return { centres: [], sites: [], availability: [], matchedSiteIds: [], assetType: 'third_line', floorLevels: [] };
          }
          const allAssets: any[] = [];
          for (const centre of centres) {
            const assets = await assetDb.getThirdLineIncomeByCentre(centre.id);
            const filtered = parsedQuery.thirdLineCategory 
              ? assets.filter((a: any) => a.categoryName?.toLowerCase().includes(parsedQuery.thirdLineCategory!.toLowerCase()))
              : assets;
            allAssets.push(...filtered.map((a: any) => ({ ...a, centreName: centre.name, assetType: 'third_line' })));
          }
          // Fetch floor levels for the first centre to display floor plan map
          const floorLevels = centres.length > 0 ? await db.getFloorLevelsByCentre(centres[0].id) : [];
          return { centres, sites: allAssets, availability: [], matchedSiteIds: [], assetType: 'third_line', floorLevels };
        }
        
        // First, search for sites using the full query to find any matches
        // This allows description-based searches like "Waverley Outside Prouds" to work
        const siteResults = await db.searchSitesWithCategory(input.query, parsedQuery.productCategory, parsedQuery.stateFilter);
        
        // Determine if query has site-specific keywords beyond just centre name
        const lowerQuery = input.query.toLowerCase();
        
        // Check for explicit site-specific patterns
        const hasSiteNumber = /site\s*\d+|#\d+|\bsite\b/i.test(lowerQuery);
        const hasProductCategory = !!parsedQuery.productCategory;
        const hasSizeRequirement = parsedQuery.minSizeM2 !== undefined;
        const hasTableRequirement = parsedQuery.minTables !== undefined;
        
        // Check if the query contains more than just a centre name by looking at the actual
        // centre names from the site results. If the query is longer than the centre name,
        // it likely contains description keywords.
        let queryHasDescriptionKeywords = false;
        if (siteResults.length > 0 && siteResults.length < 10) {
          // Get the actual centre name from the matched sites
          const actualCentreName = siteResults[0].centre?.name?.toLowerCase() || '';
          // If the query is significantly longer than the centre name, it has extra keywords
          if (actualCentreName && lowerQuery.length > actualCentreName.length + 3) {
            queryHasDescriptionKeywords = true;
          }
        }
        
        // If we found specific site matches with description keywords,
        // or if there are explicit requirements, consider it a site-specific query
        const hasSiteSpecificQuery = queryHasDescriptionKeywords || 
          hasSiteNumber || hasProductCategory || hasSizeRequirement || hasTableRequirement;
        
        // For centre search, use the extracted centre name if available
        // If centreName is empty string, keep it empty (don't fall back to original query)
        const searchQuery = parsedQuery.centreName;
        
        // If we found specific sites with category filter, extract their centres
        let centres: any[] = [];
        if (siteResults.length > 0 && parsedQuery.productCategory) {
          const centresMap = new Map();
          for (const result of siteResults) {
            if (!centresMap.has(result.site.centreId) && result.centre) {
              // Apply state filter if specified
              if (!parsedQuery.stateFilter || result.centre.state === parsedQuery.stateFilter) {
                centresMap.set(result.site.centreId, result.centre);
              }
            }
          }
          
          centres = Array.from(centresMap.values());
        }
        
        // If no centres found from category search, fall back to centre-only search
        // This handles cases like "Fashion in VIC" where VIC centres may not have fashion-approved sites
        if (centres.length === 0) {
          centres = await db.searchShoppingCentres(searchQuery, parsedQuery.stateFilter);
        }
        
        if (centres.length === 0) {
          // Get search suggestions when no results found
          const { getSearchSuggestions } = await import("../searchSuggestions");
          const suggestions = await getSearchSuggestions(searchQuery, 5);
          
          // Log failed search
          const { logSearch } = await import("../searchAnalyticsDb");
          await logSearch({
            userId: ctx.user?.id,
            query: input.query,
            centreName: parsedQuery.centreName,
            minSizeM2: parsedQuery.minSizeM2,
            productCategory: parsedQuery.productCategory,
            resultsCount: 0,
            suggestionsShown: suggestions.length,
            searchDate: input.date,
          });
          
          return { 
            centres: [], 
            sites: [], 
            availability: [], 
            matchedSiteIds: [],
            suggestions // Add suggestions to response
          };
        }

        const startOfWeek = new Date(input.date);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        const startOfNextWeek = new Date(endOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 1);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);

        const allSites: any[] = [];
        const availability: any[] = [];
        
        // Populate matchedSiteIds based on the earlier computed hasSiteSpecificQuery
        const matchedSiteIds: number[] = hasSiteSpecificQuery ? siteResults.map(r => r.site.id) : [];
        
        // Track if any sites match the size requirement
        let hasMatchingSites = false;
        const hasRequirements = parsedQuery.minSizeM2 !== undefined || parsedQuery.minTables !== undefined || parsedQuery.productCategory !== undefined;
        
        // OPTIMIZED: Batch fetch all data in minimal queries
        const { getSearchDataOptimized } = await import("../dbOptimized");
        const centreIds = centres.map(c => c.id);
        
        let {
          sitesByCentre,
          week1BookingsBySite,
          week2BookingsBySite,
          categoriesBySite,
        } = await getSearchDataOptimized(
          centreIds,
          startOfWeek,
          endOfWeek,
          startOfNextWeek,
          endOfNextWeek
        );
        
        // Override sitesByCentre if we have category-filtered sites from searchSitesWithCategory
        if (parsedQuery.productCategory) {
          if (siteResults.length > 0) {
            // We have matching sites - only show those sites
            const tempSitesByCentre = new Map();
            for (const result of siteResults) {
              const centreId = result.site.centreId;
              if (!tempSitesByCentre.has(centreId)) {
                tempSitesByCentre.set(centreId, []);
              }
              tempSitesByCentre.get(centreId)!.push(result.site);
            }
            sitesByCentre = tempSitesByCentre;
          } else {
            // Category was specified but NO sites match - clear all sites from centres
            // This ensures sites without the requested category are excluded from results
            sitesByCentre = new Map();
          }
        }
        
        // First pass: check if any sites match the requirements and find closest match
        let closestMatch: { sizeM2: number; widthM: number; lengthM: number; difference: number } | null = null;
        const requestedSizeM2 = parsedQuery.minSizeM2;
        
        for (const centre of centres) {
          const sites = sitesByCentre.get(centre.id) || [];
          
          // Check which sites match the requirements
          const sitesWithMatch = sites.map((site: any) => ({
            site,
            matchesRequirements: siteMatchesRequirements(site, parsedQuery),
            sizeMatch: requestedSizeM2 ? (site.sizeM2 === requestedSizeM2 ? 'perfect' : site.sizeM2 > requestedSizeM2 ? 'larger' : 'smaller') : null
          }));
          
          // Check if any sites match
          if (sitesWithMatch.some((s: any) => s.matchesRequirements)) {
            hasMatchingSites = true;
          }
          
          // Track closest match for size suggestions
          if (requestedSizeM2 && !hasMatchingSites) {
            for (const { site } of sitesWithMatch) {
              if (site.sizeM2 && site.sizeM2 >= requestedSizeM2) {
                const diff = Math.abs(site.sizeM2 - requestedSizeM2);
                if (!closestMatch || diff < closestMatch.difference) {
                  closestMatch = {
                    sizeM2: site.sizeM2,
                    widthM: site.widthM,
                    lengthM: site.lengthM,
                    difference: diff
                  };
                }
              }
            }
          }
        }
        
        // Second pass: collect sites based on whether matches were found
        const siteCategories: Record<number, any[]> = {};
        
        for (const centre of centres) {
          const sites = sitesByCentre.get(centre.id) || [];
          
          // Check which sites match the requirements
          const sitesWithMatch = sites.map((site: any) => ({
            site,
            matchesRequirements: siteMatchesRequirements(site, parsedQuery),
            sizeMatch: requestedSizeM2 ? (site.sizeM2 === requestedSizeM2 ? 'perfect' : site.sizeM2 > requestedSizeM2 ? 'larger' : 'smaller') : null
          }));
          
          // Determine which sites to include based on requirements
          let sitesToInclude = sitesWithMatch;
          if (hasRequirements && hasMatchingSites) {
            // If size/table requirements specified and matches found, only include matching sites
            sitesToInclude = sitesWithMatch.filter((s: any) => s.matchesRequirements);
          }
          
          const sitesWithData = sitesToInclude.map(({ site, sizeMatch }: any) => ({ ...site, centreName: centre.name, sizeMatch }));
          allSites.push(...sitesWithData);
          
          for (const { site } of sitesToInclude as any[]) {
            // Use pre-fetched data instead of individual queries
            const week1Bookings = week1BookingsBySite.get(site.id) || [];
            const week2Bookings = week2BookingsBySite.get(site.id) || [];
            const approvedCategories = categoriesBySite.get(site.id) || [];
            
            siteCategories[site.id] = approvedCategories;
            
            availability.push({
              siteId: site.id,
              siteNumber: site.siteNumber,
              centreName: centre.name,
              week1Available: week1Bookings.length === 0,
              week2Available: week2Bookings.length === 0,
              week1Bookings,
              week2Bookings,
            });
          }
        }
        
        // Return flag indicating if size requirement was met
        const sizeNotAvailable = hasRequirements && !hasMatchingSites;
        
        // Return flag indicating if category filter returned no results
        const categoryNotAvailable = !!parsedQuery.productCategory && siteResults.length === 0;
        
        // Log successful search
        const { logSearch } = await import("../searchAnalyticsDb");
        await logSearch({
          userId: ctx.user?.id,
          query: input.query,
          centreName: parsedQuery.centreName,
          minSizeM2: parsedQuery.minSizeM2,
          productCategory: parsedQuery.productCategory,
          resultsCount: allSites.length,
          suggestionsShown: 0,
          searchDate: input.date,
        });
        
        // Fetch floor levels for the first centre to display floor plan map
        let floorLevels: any[] = [];
        if (centres.length > 0) {
          floorLevels = await db.getFloorLevelsByCentre(centres[0].id);
        }
        
        return { centres, sites: allSites, availability, matchedSiteIds, sizeNotAvailable, categoryNotAvailable, closestMatch, siteCategories, floorLevels };
      }),
    byNameAndDate: publicProcedure
      .input(z.object({
        centreName: z.string(),
        date: z.date(),
      }))
      .query(async ({ input }) => {
        // Search for centres matching the name
        const centres = await db.searchShoppingCentres(input.centreName);
        
        if (centres.length === 0) {
          return { centres: [], sites: [], availability: [] };
        }

        // Get the requested week start and end
        const startOfWeek = new Date(input.date);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        // Get the following week
        const startOfNextWeek = new Date(endOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 1);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);

        // Get all sites for these centres
        const allSites = [];
        const availability = [];
        
        for (const centre of centres) {
          const sites = await db.getSitesByCentreId(centre.id);
          allSites.push(...sites.map(s => ({ ...s, centreName: centre.name })));
          
          // Check availability for each site
          for (const site of sites) {
            const week1Bookings = await db.getBookingsBySiteId(site.id, startOfWeek, endOfWeek);
            const week2Bookings = await db.getBookingsBySiteId(site.id, startOfNextWeek, endOfNextWeek);
            
            availability.push({
              siteId: site.id,
              week1Available: week1Bookings.length === 0,
              week2Available: week2Bookings.length === 0,
              week1Bookings: week1Bookings.map(b => ({ startDate: b.startDate, endDate: b.endDate })),
              week2Bookings: week2Bookings.map(b => ({ startDate: b.startDate, endDate: b.endDate })),
            });
          }
        }

        return {
          centres,
          sites: allSites,
          availability,
          requestedWeek: { start: startOfWeek, end: endOfWeek },
          followingWeek: { start: startOfNextWeek, end: endOfNextWeek },
        };
      }),
});
