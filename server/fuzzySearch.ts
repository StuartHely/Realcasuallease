import Fuse from 'fuse.js';

const STRICT_THRESHOLD = 0.3;

export async function fuzzySearchCentres(
  query: string,
  centres: Array<{ id: number; name: string | null; suburb: string | null; state: string | null }>
): Promise<Array<{ id: number; name: string | null; suburb: string | null; state: string | null; score: number }>> {
  if (!query.trim()) return centres.map(c => ({ ...c, score: 1 }));
  const fuse = new Fuse(centres, {
    keys: [{ name: 'name', weight: 0.7 }, { name: 'suburb', weight: 0.3 }],
    threshold: STRICT_THRESHOLD,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  const results = fuse.search(query);
  return results.map(result => ({ ...result.item, score: 1 - (result.score || 0) }));
}

export async function fuzzySearchSites(
  query: string,
  sites: Array<{ siteId: number; siteNumber: string | null; description: string | null; centreName: string | null; suburb: string | null; categories: string[] }>
): Promise<Array<{ siteId: number; score: number }>> {
  if (!query.trim()) return sites.map(s => ({ siteId: s.siteId, score: 1 }));
  const fuse = new Fuse(sites, {
    keys: [{ name: 'centreName', weight: 0.4 }, { name: 'suburb', weight: 0.2 }, { name: 'siteNumber', weight: 0.2 }, { name: 'description', weight: 0.1 }, { name: 'categories', weight: 0.1 }],
    threshold: STRICT_THRESHOLD,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  const results = fuse.search(query);
  return results.map(result => ({ siteId: result.item.siteId, score: 1 - (result.score || 0) }));
}
