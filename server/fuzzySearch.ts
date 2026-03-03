import Fuse, { FuseResult } from 'fuse.js';

const STRICT_THRESHOLD = 0.4;

type CentreItem = { id: number; name: string | null; suburb: string | null; state: string | null };
type SiteItem = { siteId: number; siteNumber: string | null; description: string | null; centreName: string | null; suburb: string | null; categories: string[] };

export async function fuzzySearchCentres(
  query: string,
  centres: Array<CentreItem>
): Promise<Array<CentreItem & { score: number }>> {
  if (!query.trim()) return centres.map(c => ({ ...c, score: 1 }));
  const fuse = new Fuse(centres, {
    keys: [{ name: 'name', weight: 0.7 }, { name: 'suburb', weight: 0.3 }],
    threshold: STRICT_THRESHOLD,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  const results: FuseResult<CentreItem>[] = fuse.search(query);
  return results.map((result: FuseResult<CentreItem>) => ({ ...result.item, score: 1 - (result.score || 0) }));
}

export async function fuzzySearchSites(
  query: string,
  sites: Array<SiteItem>
): Promise<Array<{ siteId: number; score: number }>> {
  if (!query.trim()) return sites.map(s => ({ siteId: s.siteId, score: 1 }));
  const fuse = new Fuse(sites, {
    keys: [{ name: 'centreName', weight: 0.4 }, { name: 'suburb', weight: 0.2 }, { name: 'siteNumber', weight: 0.2 }, { name: 'description', weight: 0.1 }, { name: 'categories', weight: 0.1 }],
    threshold: STRICT_THRESHOLD,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  const results: FuseResult<SiteItem>[] = fuse.search(query);
  return results.map((result: FuseResult<SiteItem>) => ({ siteId: result.item.siteId, score: 1 - (result.score || 0) }));
}
