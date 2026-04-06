import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import * as assetDb from "../assetDb";
import { buildCacheKey, getCached, setCache } from "../searchCache";

export const searchRouter = router({
    // Smart search with site-level support
    smart: publicProcedure
      .input(z.object({ query: z.string(), date: z.date() }))
      .query(async ({ input, ctx }) => {
        // Check cache first (5-min TTL)
        const cacheKey = buildCacheKey(input.query, input.date);
        const cached = getCached(cacheKey);
        if (cached) {
          return cached;
        }
        // Parse query to extract requirements
        const { parseSearchQuery, siteMatchesRequirements } = await import("../../shared/queryParser");
        const parsedQuery = parseSearchQuery(input.query);

        // --- Enhanced location matching ---
        // If the rule-based parser couldn't find a location, try the location index
        let enhancedQuery = parsedQuery;

        // Try LLM intent parsing for complex natural language
        const { shouldUseLLM, parseIntentWithLLM, mergeLLMIntent } = await import("../intentParser");
        if (shouldUseLLM(parsedQuery)) {
          const llmIntent = await parseIntentWithLLM(input.query);
          if (llmIntent) {
            enhancedQuery = mergeLLMIntent(parsedQuery, llmIntent);
          }
        }

        // Try area-based location matching if we have a location but no centre match
        const { findCentresByArea } = await import("../locationIndex");
        let areaCentres: any[] | null = null;

        // Extract the area name — could be from rule parser or LLM
        // Try centreName first, then the original matched alias (e.g. "maroubra")
        const areaQuery = enhancedQuery.centreName || enhancedQuery.matchedLocation || "";
        const areaCandidates = [areaQuery, enhancedQuery.matchedLocation].filter(
          (q): q is string => !!q && q !== areaQuery,
        );
        // Include the primary query and any distinct alias
        for (const candidate of [areaQuery, ...areaCandidates]) {
          if (!candidate) continue;
          const areaMatches = await findCentresByArea(candidate);
          if (areaMatches.length > 0) {
            areaCentres = areaMatches.map(m => ({
              id: m.centreId,
              name: m.centreName,
              slug: m.slug,
              suburb: m.suburb,
              city: m.city,
              state: m.state,
            }));
            break;
          }
        }

        // If asset type is specified (VS or 3rdL), search only that type
        if (enhancedQuery.assetType === 'vacant_shop') {
          const searchQuery = enhancedQuery.centreName;
          let centres = await db.searchShoppingCentres(searchQuery, enhancedQuery.stateFilter, ctx.tenantOwnerId ?? undefined);
          // Fallback: if centre name search failed but we have a state filter, show all centres in that state
          if (centres.length === 0 && enhancedQuery.stateFilter && searchQuery) {
            centres = await db.searchShoppingCentres('', enhancedQuery.stateFilter, ctx.tenantOwnerId ?? undefined);
          }
          // Fallback: use area-based centre matches if available
          if (centres.length === 0 && areaCentres && areaCentres.length > 0) {
            centres = await db.searchShoppingCentres('', undefined, ctx.tenantOwnerId ?? undefined);
            const areaCentreIds = new Set(areaCentres.map(c => c.id));
            centres = centres.filter((c: any) => areaCentreIds.has(c.id));
          }
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
          const searchQuery = enhancedQuery.centreName;
          let centres = await db.searchShoppingCentres(searchQuery, enhancedQuery.stateFilter, ctx.tenantOwnerId ?? undefined);
          // Fallback: if centre name search failed but we have a state filter, show all centres in that state
          if (centres.length === 0 && enhancedQuery.stateFilter && searchQuery) {
            centres = await db.searchShoppingCentres('', enhancedQuery.stateFilter, ctx.tenantOwnerId ?? undefined);
          }
          // Fallback: use area-based centre matches if available
          if (centres.length === 0 && areaCentres && areaCentres.length > 0) {
            centres = await db.searchShoppingCentres('', undefined, ctx.tenantOwnerId ?? undefined);
            const areaCentreIds = new Set(areaCentres.map(c => c.id));
            centres = centres.filter((c: any) => areaCentreIds.has(c.id));
          }
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
        
        // -----------------------------------------------------------
        // Determine which CENTRES to show.
        // Priority: 0) "near me"  1) area index  2) centre-name search  3) fallbacks
        // Category is used later to filter/rank SITES within those centres,
        // NOT to decide which centres appear.
        // -----------------------------------------------------------
        let centres: any[] = [];
        let nearMeUsed = false;

        // 0. "Near me" — geocode user's address and find centres within radius
        if (enhancedQuery.nearMe && ctx.user) {
          const profile = await db.getCustomerProfileByUserId(ctx.user.id);
          if (profile?.streetAddress || profile?.city) {
            const addressStr = [profile.streetAddress, profile.city, profile.state, profile.postcode].filter(Boolean).join(', ');
            try {
              const { searchPlaces } = await import("../_core/amazonLocation");
              const results = await searchPlaces(addressStr, { maxResults: 1 });
              const coords = results[0]?.addressComponents;
              if (coords?.latitude && coords?.longitude) {
                const { findCentresNearCoordinates } = await import("../locationIndex");
                const radiusKm = enhancedQuery.radiusKm || 25;
                const nearby = await findCentresNearCoordinates(coords.latitude, coords.longitude, radiusKm);
                if (nearby.length > 0) {
                  centres = nearby.map(m => ({
                    id: m.centreId,
                    name: m.centreName,
                    slug: m.slug,
                    suburb: m.suburb,
                    city: m.city,
                    state: m.state,
                    distance: m.distance,
                  }));
                  nearMeUsed = true;
                }
              }
            } catch (e) {
              console.error('[Search] Near-me geocode failed:', e);
            }
          }
        }

        // 1. Area index matched a known region (e.g. "western sydney", "maroubra")
        if (centres.length === 0 && areaCentres && areaCentres.length > 0) {
          centres = areaCentres;
        }

        // 2. Centre-name fuzzy search
        if (centres.length === 0) {
          centres = await db.searchShoppingCentres(searchQuery, enhancedQuery.stateFilter, ctx.tenantOwnerId ?? undefined);
        }

        // 3. If centre name search returned nothing but we have a state filter,
        //    show all centres in that state.
        if (centres.length === 0 && enhancedQuery.stateFilter && searchQuery) {
          centres = await db.searchShoppingCentres('', enhancedQuery.stateFilter, ctx.tenantOwnerId ?? undefined);
        }

        // 4. Infer state from area name as last resort
        if (centres.length === 0 && !enhancedQuery.stateFilter && areaQuery) {
          const AREA_STATE_MAP: Record<string, string> = {
            brisbane: 'QLD', 'gold coast': 'QLD', 'sunshine coast': 'QLD',
            cairns: 'QLD', townsville: 'QLD',
            sydney: 'NSW', 'central coast': 'NSW', newcastle: 'NSW', wollongong: 'NSW',
            melbourne: 'VIC', geelong: 'VIC',
            perth: 'WA', adelaide: 'SA', hobart: 'TAS', darwin: 'NT', canberra: 'ACT',
          };
          const inferredState = AREA_STATE_MAP[areaQuery.toLowerCase()];
          if (inferredState) {
            centres = await db.searchShoppingCentres('', inferredState, ctx.tenantOwnerId ?? undefined);
          }
        }

        // 5. Category-only search (no location matched) — derive centres from
        //    the category-matched siteResults so all centres with approved
        //    sites for the searched category are shown.
        //    Only when there was truly no location intent — if a location was
        //    specified but not found, we should NOT broaden to all centres.
        const hasLocationIntent = !!(enhancedQuery.centreName || enhancedQuery.matchedLocation || enhancedQuery.stateFilter || enhancedQuery.nearMe);
        if (centres.length === 0 && enhancedQuery.productCategory && siteResults.length > 0 && !hasLocationIntent) {
          const centreIdsSeen = new Set<number>();
          const categoryCentresRaw: any[] = [];
          for (const result of siteResults) {
            const c = result.centre;
            if (c && !centreIdsSeen.has(c.id)) {
              centreIdsSeen.add(c.id);
              categoryCentresRaw.push(c);
            }
          }
          if (categoryCentresRaw.length > 0) {
            centres = categoryCentresRaw;
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
        
        // Populate matchedSiteIds — only from sites within the selected centres
        const locationCentreIdSet = new Set(centres.map((c: any) => c.id));
        const matchedSiteIds: number[] = hasSiteSpecificQuery
          ? siteResults.filter(r => locationCentreIdSet.has(r.site.centreId)).map(r => r.site.id)
          : [];
        
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
        
        // If category filter matched specific sites, restrict to those sites
        // BUT only within the location-determined centres.
        if (enhancedQuery.productCategory && siteResults.length > 0) {
          const centreIdSet = new Set(centreIds);
          const tempSitesByCentre = new Map();
          for (const result of siteResults) {
            const centreId = result.site.centreId;
            if (!centreIdSet.has(centreId)) continue; // ignore sites outside our location
            if (!tempSitesByCentre.has(centreId)) {
              tempSitesByCentre.set(centreId, []);
            }
            tempSitesByCentre.get(centreId)!.push(result.site);
          }
          // Always override — only show sites approved for the searched category
          sitesByCentre = tempSitesByCentre;
        } else if (enhancedQuery.productCategory && siteResults.length === 0) {
          // Category was searched but no sites anywhere have it approved — show nothing
          sitesByCentre = new Map();
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

        // Filter out sites where the searched category is not approved.
        // Sites with no categories defined are also excluded — if the user
        // explicitly searched for a category we should only show sites that
        // are confirmed to accept it.
        if (enhancedQuery.productCategory) {
          const { fuzzyMatchCategory } = await import("../../shared/stringSimilarity");
          const lowerCat = enhancedQuery.productCategory.toLowerCase();
          const filteredSites = allSites.filter((site: any) => {
            const categories = siteCategories[site.id] || [];
            if (categories.length === 0) return false; // no categories defined — exclude
            return categories.some((cat: any) =>
              fuzzyMatchCategory(lowerCat, cat.name, 0.6)
            );
          });
          allSites.length = 0;
          allSites.push(...filteredSites);
        }

        // Return flag indicating if size requirement was met
        const sizeNotAvailable = hasRequirements && !hasMatchingSites;
        
        // Check how many category-matched sites are within the selected centres
        const centreIdSet = new Set(centres.map((c: any) => c.id));
        const localCategorySiteCount = siteResults.filter(r => centreIdSet.has(r.site.centreId)).length;

        // Only flag category as unavailable if we have NO sites at all
        const categoryNotAvailable = !!enhancedQuery.productCategory && localCategorySiteCount === 0 && allSites.length === 0;

        // Flag when category keyword was provided but no sites in the location match it.
        // First check if the keyword matches a *known* database category — if so,
        // it's not "unrecognised", just no sites are approved for it yet.
        let categoryUnrecognised = false;
        let matchedCategoryName: string | null = null;
        if (enhancedQuery.productCategory && localCategorySiteCount === 0 && allSites.length > 0) {
          const { getAllUsageCategories } = await import("../usageCategoriesDb");
          const { fuzzyMatchCategory } = await import("../../shared/stringSimilarity");
          const allCategories = await getAllUsageCategories();
          const matched = allCategories.find((cat: any) =>
            fuzzyMatchCategory(enhancedQuery.productCategory!, cat.name, 0.6)
          );
          if (matched) {
            matchedCategoryName = matched.name;
          } else {
            // Keyword doesn't match any known DB category — truly unrecognised
            const anySiteHasCategories = allSites.some((s: any) => (siteCategories[s.id] || []).length > 0);
            categoryUnrecognised = anySiteHasCategories;
          }
        }

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
              categoryUnrecognised,
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
        
        // Prune centres that have zero sites remaining after category filtering.
        // When a product category was searched, only show centres that actually
        // have approved sites for that category — never show irrelevant centres.
        let categoryFallbackUsed = false;
        let categoryFallbackCentreNames: string[] = [];
        const originalCentreNames = centres.map((c: any) => c.name);
        
        if (allSites.length > 0) {
          const centreIdsWithSites = new Set(allSites.map((s: any) => s.centreId));
          centres = centres.filter((c: any) => centreIdsWithSites.has(c.id));
        } else if (enhancedQuery.productCategory) {
          // No sites in the searched area match the category.
          // Try to find other centres that DO have approved sites for this category,
          // using the siteResults (which searched globally by category).
          const fallbackCentreIds = new Set<number>();
          const fallbackCentres: any[] = [];
          for (const result of siteResults) {
            const c = result.centre;
            if (c && !fallbackCentreIds.has(c.id)) {
              fallbackCentreIds.add(c.id);
              fallbackCentres.push(c);
            }
          }

          if (fallbackCentres.length > 0) {
            // We found centres elsewhere — use them as fallback results
            centres = fallbackCentres;
            categoryFallbackUsed = true;
            categoryFallbackCentreNames = originalCentreNames;

            // Reload sites for the fallback centres
            allSites.length = 0;
            for (const centre of centres) {
              const centreSites = await db.getSitesByCentreId(centre.id);
              allSites.push(...centreSites.map((s: any) => ({
                ...s,
                centreName: centre.name,
              })));
            }

            // Re-filter by category
            const { fuzzyMatchCategory } = await import("../../shared/stringSimilarity");
            const lowerCat = enhancedQuery.productCategory.toLowerCase();
            const { getApprovedCategoriesForMultipleSites } = await import("../dbOptimized");
            const fallbackCatMap = await getApprovedCategoriesForMultipleSites(allSites.map((s: any) => s.id));
            const newSiteCategories: Record<number, any[]> = {};
            fallbackCatMap.forEach((cats, siteId) => {
              newSiteCategories[siteId] = cats;
            });
            const filteredFallback = allSites.filter((site: any) => {
              const cats = newSiteCategories[site.id] || [];
              return cats.some((cat: any) => fuzzyMatchCategory(lowerCat, cat.name, 0.6));
            });
            allSites.length = 0;
            allSites.push(...filteredFallback);
            // Merge categories into siteCategories
            Object.assign(siteCategories, newSiteCategories);

            // Prune fallback centres to only those with matching sites
            const fallbackCentreIdsWithSites = new Set(allSites.map((s: any) => s.centreId));
            centres = centres.filter((c: any) => fallbackCentreIdsWithSites.has(c.id));
          } else {
            // No centres anywhere have this category — clear everything
            centres = [];
          }
        }

        // Fetch floor levels for all matched centres (keyed by centreId for per-centre maps)
        let floorLevels: any[] = [];
        const floorLevelsByCentre: Record<number, any[]> = {};
        for (const c of centres) {
          const levels = await db.getFloorLevelsByCentre(c.id);
          floorLevelsByCentre[c.id] = levels;
          if (floorLevels.length === 0) floorLevels = levels; // backward compat
        }
        
        // Enrich sites with seasonal rates for the displayed 14-day range
        const { getSeasonalRatesForDateRange } = await import("../seasonalRatesDb");
        const rangeStart = input.date.toISOString().split('T')[0];
        const rangeEndDate = new Date(input.date);
        rangeEndDate.setDate(rangeEndDate.getDate() + 13);
        const rangeEnd = rangeEndDate.toISOString().split('T')[0];
        const seasonalRatesBySite: Record<number, any[]> = {};
        for (const site of allSites) {
          const rates = await getSeasonalRatesForDateRange(site.id, rangeStart, rangeEnd);
          if (rates.length > 0) {
            seasonalRatesBySite[site.id] = rates;
          }
        }

        const result = {
          centres,
          sites: allSites,
          availability,
          matchedSiteIds,
          totalSites: allSites.length,
          sizeNotAvailable,
          categoryNotAvailable,
          categoryUnrecognised,
          matchedCategoryName,
          closestMatch,
          siteCategories,
          siteScores: scored.scores,
          floorLevels,
          floorLevelsByCentre,
          seasonalRatesBySite,
          categoryFallbackUsed,
          categoryFallbackLocation: categoryFallbackUsed ? (categoryFallbackCentreNames.length > 0 ? categoryFallbackCentreNames.join(', ') : (enhancedQuery.centreName || enhancedQuery.matchedLocation || 'your selected area')) : null,
          searchInterpretation: {
            productCategory: enhancedQuery.productCategory || null,
            location: nearMeUsed ? 'near me' : (enhancedQuery.centreName || enhancedQuery.matchedLocation || null),
            nearMe: nearMeUsed || undefined,
            radiusKm: nearMeUsed ? (enhancedQuery.radiusKm || 25) : undefined,
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

        // Cache the result (5-min TTL)
        setCache(cacheKey, result);

        return result;
      }),
    byNameAndDate: publicProcedure
      .input(z.object({
        centreName: z.string(),
        date: z.date(),
      }))
      .query(async ({ input, ctx }) => {
        // Search for centres matching the name
        const centres = await db.searchShoppingCentres(input.centreName, undefined, ctx.tenantOwnerId ?? undefined);
        
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
