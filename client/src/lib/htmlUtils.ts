export function cleanHtmlDescription(html: string | null | undefined): string {
  if (!html) return "";
  
  // Strip HTML tags
  let clean = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    clean = clean.replaceAll(entity, char);
  }
  
  return clean.trim();
}