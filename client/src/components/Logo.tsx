import { useLogo } from "@/hooks/useLogo";
import { useTenant } from "@/contexts/TenantContext";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
  ownerId?: number; // Optional: show specific owner's logo
}

/**
 * Dynamic Logo Component
 * Displays the currently selected logo from system config
 * Updates automatically when logo selection changes
 * 
 * If ownerId is provided, displays that owner's allocated logo
 * Otherwise displays the default platform logo (or logged-in owner's logo)
 * Tenant branded logo takes precedence on tenant sites.
 */
export default function Logo({ 
  className = "", 
  width = 180, 
  height = 60,
  alt = "Real Casual Leasing",
  ownerId
}: LogoProps) {
  const tenant = useTenant();
  const { currentLogoUrl } = useLogo(ownerId);

  const logoUrl = tenant.isTenantSite && tenant.brandLogoUrl ? tenant.brandLogoUrl : currentLogoUrl;
  const logoAlt = tenant.isTenantSite ? tenant.brandName : alt;

  return (
    <img
      src={logoUrl}
      alt={logoAlt}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
