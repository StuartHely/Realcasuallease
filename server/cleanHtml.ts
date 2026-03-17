export function cleanHtmlEntities(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  
  let clean = text
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"');
  // Decode numeric entities (&#NNN; and &#xHHH;)
  clean = clean.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  clean = clean.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return clean.trim();
}