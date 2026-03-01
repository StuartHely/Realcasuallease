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

        // --- Enhanced location matching ---
        // If the rule-based parser couldn't find a location, try the location index
        let enhancedQuery = parsedQuery;

        if (!parsedQuery.centreName && !parsedQuery.matchedLocation) {
          // Try LLM intent parsing for complex natural language
          const { shouldUseLLM, parseIntentWithLLM, mergeLLMIntent } = await import("../intentParser");
          if (shouldUseLLM(parsedQuery)) {
            const llmIntent = await parseIntentWithLLM(input.query);
            if (llmIntent) {
              enhancedQuery = mergeLLMIntent(parsedQuery, llmIntent);
            }
          }
        }

        // Try area-based location matching if we have a location but no centre match
        const { findCentresByArea } = await import("../locationIndex");
        let areaCentres: any[] | null = null;

        // Extract the area name — could be from rule parser or LLM
        const areaQuery = enhancedQuery.centreName || enhancedQuery.matchedLocation || "";
        if (areaQuery) {
          const areaMatches = await findCentresByArea(areaQuery);
          if (areaMatches.length > 0) {
            areaCentres = areaMatches.map(m => ({
              id: m.centreId,
              name: m.centreName,
              slug: m.slug,
              suburb: m.suburb,
              city: m.city,
              state: m.state,
            }));
          }
        }

        // If asset type is specified (VS or 3rdL), search only that type
        if (enhancedQuery.assetType === 'vacant_shop') {
          const searchQuery = enhancedQuery.centreName || input.query;
          const centres = await db.searchShoppingCentres(searchQuery, enhancedQuery.stateFilter);
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
        
        if (enhancedQuery.assetType === 'third_line') {
          const searchQuery = enhancedQuery.centreName || input.query;
          const centres = await db.searchShoppingCentres(searchQuery, enhancedQuery.stateFilter);
          if (centres.length === 0) {
            return { centres: [], sites: [], availability: [], matchedSiteIds: [], assetType: 'third_line', floorLevels: [] };
          }
          const allAssets: any[] = [];
          for (const centre of centres) {
            const assets = await assetDb.getThirdLineIncomeByCentre(centre.id);
            const filtered = enhancedQuery.thirdLineCategory 
              ? assets.filter((a: any) => a.categoryName?.toLowerCase().includes(enhancedQuery.thirdLineCategory!.toLowerCase()))
              : assets;
            allAssets.push(...filtered.map((a: any) => ({ ...a, centreName: centre.name, assetType: 'third_line' })));
          }
          // Fetch floor levels for the first centre to display floor plan map
          const floorLevels = centres.length > 0 ? await db.getFloorLevelsByCentre(centres[0].id) : [];
          return { centres, sites: allAssets, availability: [], matchedSiteIds: [], assetType: 'third_line', floorLevels };
        }
        
        // First, search for sites using the full query to find any matches
        // This allows description-based searches like "Waverley Outside Prouds" to work
        const siteResults = await db.searchSitesWithCategory(input.query, enhancedQuery.productCategory, enhancedQuery.stateFilter);
        
        // Determine if query has site-specific keywords beyond just centre name
        const lowerQuery = input.query.toLowerCase();
        
        // Check for explicit site-specific patterns
        const hasSiteNumber = /site\s*\d+|#\d+|\bsite\b/i.test(lowerQuery);
        const hasProductCategory = !!enhancedQuery.productCategory;
        const hasSizeRequirement = enhancedQuery.minSizeM2 !== undefined;
        const hasTableRequirement = enhancedQuery.minTables !== undefined;
        
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
        const searchQuery = enhancedQuery.centreName;
        
        // If we found specific sites with category filter, extract their centres
        let centres: any[] = [];
        if (siteResults.length > 0 && enhancedQuery.productCategory) {
          const centresMap = new Map();
          for (const result of siteResults) {
            if (!centresMap.has(result.site.centreId) && result.centre) {
              // Apply state filter if specified
              if (!enhancedQuery.stateFilter || result.centre.state === enhancedQuery.stateFilter) {
                centresMap.set(result.site.centreId, result.centre);
              }
            }
          }
          
          centres = Array.from(centresMap.values());
        }
        
        // If no centres found from category search, fall back to centre-only search
        // This handles cases like "Fashion in VIC" where VIC centres may not have fashion-approved sites
        if (centres.length === 0) {
          centres = await db.searchShoppingCentres(searchQuery, enhancedQuery.stateFilter);
        }

        // If still no results and we have area matches, use those
        if (centres.length === 0 && areaCentres && areaCentres.length > 0) {
          centres = areaCentres;
        }

        // Fallback: if area search found nothing but we can infer a state, show all centres in that state
        if (centres.length === 0 && !enhancedQuery.stateFilter && areaQuery) {
          // Check if the area name maps to a known state
          const AREA_STATE_MAP: Record<string, string> = {
            brisbane: 'QLD', 'gold coast': 'QLD', 'sunshine coast': 'QLD',
            cairns: 'QLD', townsville: 'QLD',
            sydney: 'NSW', 'central coast': 'NSW', newcastle: 'NSW', wollongong: 'NSW',
            melbourne: 'VIC', geelong: 'VIC',
            perth: 'WA', adelaide: 'SA', hobart: 'TAS', darwin: 'NT', canberra: 'ACT',
          };
          const inferredState = AREA_STATE_MAP[areaQuery.toLowerCase()];
          if (inferredState) {
            centres = await db.searchShoppingCentres('', inferredState);
          }
        }
        
        if (centres.length === 0) {
          // Get search suggestions when no results found
          const { getSearchSuggestions } = await import("../searchSuggestions");
          const suggestions = await getSearchSuggestions(searchQuery, 5);
          
          // Log failed search (fire-and-forget — never block results)
          import("../searchAnalyticsDb").then(({ logSearch }) =>
            logSearch({
              userId: ctx.user?.id,
              query: input.query,
              centreName: enhancedQuery.centreName,
              minSizeM2: enhancedQuery.minSizeM2,
              productCategory: enhancedQuery.productCategory,
              resultsCount: 0,
              suggestionsShown: suggestions.length,
              searchDate: input.date,
            })
          ).catch(() => {});
          
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
        const hasRequirements = enhancedQuery.minSizeM2 !== undefined || enhancedQuery.minTables !== undefined || enhancedQuery.productCategory !== undefined;
        
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
        if (enhancedQuery.productCategory) {
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
          }
          // When no sites match the category, keep all sites — scoring will rank them
          // lower for category mismatch, and they'll appear in "Other Options"
        }
        
        // First pass: check if any sites match the requirements and find closest match
        let closestMatch: { sizeM2: number; widthM: number; lengthM: number; difference: number } | null = null;
        const requestedSizeM2 = enhancedQuery.minSizeM2;
        
        for (const centre of centres) {
          const sites = sitesByCentre.get(centre.id) || [];
          
          // Check which sites match the requirements
          const sitesWithMatch = sites.map((site: any) => ({
            site,
            matchesRequirements: siteMatchesRequirements(site, enhancedQuery),
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
            matchesRequirements: siteMatchesRequirements(site, enhancedQuery),
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
        
        // Exclude sites that ONLY have free categories (Charity, Government) unless user explicitly searched for them
        const isFreeCategorySearch = enhancedQuery.productCategory && 
          ['charity', 'charities', 'government', 'community'].includes(enhancedQuery.productCategory.toLowerCase());

        if (!isFreeCategorySearch) {
          const filteredSites = [];
          for (const site of allSites) {
            const categories = siteCategories[site.id] || [];
            if (categories.length === 0) {
              filteredSites.push(site);
            } else {
              const hasPaidCategory = categories.some((cat: any) => !cat.isFree);
              if (hasPaidCategory) {
                filteredSites.push(site);
              }
            }
          }
          allSites.length = 0;
          allSites.push(...filteredSites);
        }

        // Return flag indicating if size requirement was met
        const sizeNotAvailable = hasRequirements && !hasMatchingSites;
        
        // Only flag category as unavailable if we have NO sites at all
        // (when sites exist but don't match the category, scoring handles it via lower ranks)
        const categoryNotAvailable = !!enhancedQuery.productCategory && siteResults.length === 0 && allSites.length === 0;

        // --- Score and rank sites ---
        const { scoreAndRankSites } = await import("../siteScoring");
        const availabilityMap = new Map<number, { week1Available: boolean; week2Available: boolean }>();
        for (const a of availability) {
          availabilityMap.set(a.siteId, { week1Available: a.week1Available, week2Available: a.week2Available });
        }
        // Build a set of centre IDs that are an exact location match (from areaCentres or direct centre search)
        const exactLocationCentreIds = new Set<number>(
          (areaCentres || centres).map((c: any) => c.id),
        );
        const scored = scoreAndRankSites(
          allSites,
          siteCategories,
          availabilityMap,
          enhancedQuery,
          exactLocationCentreIds,
        );
        // Replace allSites with sorted order
        allSites.length = 0;
        allSites.push(...scored.sites);

        // Apply price filtering: if budget constraints are specified, filter out sites way over budget
        if (enhancedQuery.maxPricePerDay || enhancedQuery.maxPricePerWeek || enhancedQuery.maxBudget) {
          const filtered = allSites.filter((site: any) => {
            const score = scored.scores[site.id];
            return score ? score.priceMatch > 0 : true;
          });
          if (filtered.length > 0) {
            allSites.length = 0;
            allSites.push(...filtered);
          }
        }
        
        // Compute top result score for analytics
        const topResultScore = allSites.length > 0
          ? (scored.scores[allSites[0].id]?.total ?? 0)
          : 0;
        const parserUsed = enhancedQuery !== parsedQuery ? 'llm' : 'rules';

        // Log successful search (fire-and-forget — never block results)
        import("../searchAnalyticsDb").then(({ logSearch }) =>
          logSearch({
            userId: ctx.user?.id,
            query: input.query,
            centreName: enhancedQuery.centreName,
            minSizeM2: enhancedQuery.minSizeM2,
            productCategory: enhancedQuery.productCategory,
            resultsCount: allSites.length,
            suggestionsShown: 0,
            searchDate: input.date,
            parsedIntent: {
              productCategory: enhancedQuery.productCategory || null,
              location: enhancedQuery.centreName || enhancedQuery.matchedLocation || null,
              state: enhancedQuery.stateFilter || null,
              assetType: enhancedQuery.assetType || null,
              maxPricePerDay: enhancedQuery.maxPricePerDay || null,
              maxPricePerWeek: enhancedQuery.maxPricePerWeek || null,
              maxBudget: enhancedQuery.maxBudget || null,
            },
            parserUsed,
            topResultScore,
          })
        ).catch(() => {});
        
        // Fetch floor levels for the first centre to display floor plan map
        let floorLevels: any[] = [];
        if (centres.length > 0) {
          floorLevels = await db.getFloorLevelsByCentre(centres[0].id);
        }
        
        return {
          centres,
          sites: allSites,
          availability,
          matchedSiteIds,
          sizeNotAvailable,
          categoryNotAvailable,
          closestMatch,
          siteCategories,
          siteScores: scored.scores,
          floorLevels,
          searchInterpretation: {
            productCategory: enhancedQuery.productCategory || null,
            location: enhancedQuery.centreName || enhancedQuery.matchedLocation || null,
            state: enhancedQuery.stateFilter || null,
            assetType: enhancedQuery.assetType || null,
            dateRange: enhancedQuery.parsedDate ? {
              start: enhancedQuery.parsedDate,
              end: enhancedQuery.dateRangeEnd || null,
            } : null,
            budget: enhancedQuery.maxPricePerDay || enhancedQuery.maxPricePerWeek || enhancedQuery.maxBudget ? {
              maxPerDay: enhancedQuery.maxPricePerDay || null,
              maxPerWeek: enhancedQuery.maxPricePerWeek || null,
              maxTotal: enhancedQuery.maxBudget || null,
            } : null,
            parserUsed,
          },
        };
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
