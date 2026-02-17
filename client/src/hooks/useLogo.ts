import { trpc } from "@/lib/trpc";

/**
 * Hook to get the currently selected logo
 * Returns the logo ID and URLs for all logos
 * 
 * @param ownerId - Optional owner ID to get owner-specific logo
 */
export function useLogo(ownerId?: number) {
  const { data: currentLogo } = trpc.systemConfig.getCurrentLogo.useQuery();
  const { data: ownerLogo } = trpc.systemConfig.getOwnerLogo.useQuery(
    { ownerId: ownerId! },
    { enabled: !!ownerId }
  );
  const { data: myLogo } = trpc.systemConfig.getMyLogo.useQuery(undefined, {
    enabled: !ownerId, // Only fetch if no ownerId specified
  });
  const { data: allLogos } = trpc.systemConfig.getAllLogos.useQuery();

  // Determine which logo to use:
  // 1. If ownerId provided, use owner's allocated logo
  // 2. If logged in user is owner, use their allocated logo
  // 3. Otherwise use platform default logo
  const logoData = ownerId ? ownerLogo : (myLogo || currentLogo);
  const selectedLogoId = logoData?.logoId || logoData?.selectedLogo || "logo_1";
  const currentLogoUrl = logoData?.logoUrl || allLogos?.[selectedLogoId as keyof typeof allLogos] || "/logos/logo_1.png";

  return {
    selectedLogoId,
    currentLogoUrl,
    allLogos,
  };
}
