import { getConfigValue } from './systemConfigDb';
import { getUserById } from './db';

/**
 * Get the currently selected logo URL for use in PDFs, emails, and reports
 * If ownerId is provided, returns that owner's allocated logo
 */
export async function getCurrentLogoUrl(ownerId?: number): Promise<string> {
  let selectedLogo = "logo_1";
  
  // If ownerId provided, try to get their allocated logo
  if (ownerId) {
    const owner = await getUserById(ownerId);
    if (owner?.allocatedLogoId) {
      selectedLogo = owner.allocatedLogoId;
    } else {
      // Owner has no allocated logo, use default platform logo
      selectedLogo = await getConfigValue("selected_logo") || "logo_1";
    }
  } else {
    // No owner specified, use default platform logo
    selectedLogo = await getConfigValue("selected_logo") || "logo_1";
  }
  
  // Try to get custom uploaded logo URL first
  const customLogoUrl = await getConfigValue(`${selectedLogo}_url`);
  
  if (customLogoUrl) {
    return customLogoUrl;
  }
  
  // Fallback to default logo path
  // In production, this should be your full domain URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/logos/${selectedLogo}.png`;
}

/**
 * Get logo as base64 for embedding in PDFs
 * This fetches the image and converts it to base64 for jsPDF
 * If ownerId is provided, returns that owner's allocated logo
 */
export async function getLogoAsBase64(ownerId?: number): Promise<string | null> {
  try {
    const logoUrl = await getCurrentLogoUrl(ownerId);
    
    // If it's a local file path, read directly
    if (logoUrl.includes('/logos/logo_')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Extract filename from URL
      const filename = logoUrl.split('/').pop();
      const logoPath = path.join(process.cwd(), 'client', 'public', 'logos', filename!);
      
      try {
        const imageBuffer = await fs.readFile(logoPath);
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
      } catch (err) {
        console.warn('[Logo] Local logo file not found:', logoPath);
        return null;
      }
    }
    
    // If it's a remote URL (S3), fetch it
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.warn('[Logo] Failed to fetch logo from URL:', logoUrl);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    // Detect image type from response
    const contentType = response.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
    
  } catch (error) {
    console.error('[Logo] Error loading logo for PDF:', error);
    return null;
  }
}

/**
 * Get logo URL for use in HTML emails
 * If ownerId is provided, returns that owner's allocated logo
 */
export async function getLogoUrlForEmail(ownerId?: number): Promise<string> {
  const logoUrl = await getCurrentLogoUrl(ownerId);
  
  // For emails, we need a publicly accessible URL
  // If it's a local path, convert to full URL
  if (logoUrl.startsWith('/')) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${logoUrl}`;
  }
  
  return logoUrl;
}

/**
 * Helper to determine owner from booking/site/centre context
 * Use this when generating documents to automatically get the right logo
 */
export async function getOwnerIdFromContext(params: {
  bookingId?: number;
  siteId?: number;
  centreId?: number;
}): Promise<number | undefined> {
  try {
    const { getBookingById, getSiteById, getShoppingCentreById } = await import('./db');
    
    // If we have a booking, get the site owner
    if (params.bookingId) {
      const booking = await getBookingById(params.bookingId);
      if (booking) {
        const site = await getSiteById(booking.siteId);
        if (site) {
          const centre = await getShoppingCentreById(site.centreId);
          return centre?.ownerId;
        }
      }
    }
    
    // If we have a site, get the centre owner
    if (params.siteId) {
      const site = await getSiteById(params.siteId);
      if (site) {
        const centre = await getShoppingCentreById(site.centreId);
        return centre?.ownerId;
      }
    }
    
    // If we have a centre, get its owner
    if (params.centreId) {
      const centre = await getShoppingCentreById(params.centreId);
      return centre?.ownerId;
    }
    
    return undefined;
  } catch (error) {
    console.error('[Logo] Error getting owner from context:', error);
    return undefined;
  }
}
