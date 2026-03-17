export function cleanHtmlDescription(html: string | null | undefined): string {
  if (!html) return "";
  
  // Use a temporary DOM element to properly strip HTML and decode ALL entities
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').trim();
}