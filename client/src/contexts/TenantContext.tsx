import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type TenantBranding = {
  brandName: string;
  brandLogoUrl: string | null;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandFaviconUrl: string | null;
  brandFooterText: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  isTenantSite: boolean;
};

const defaultBranding: TenantBranding = {
  brandName: "Casual Lease",
  brandLogoUrl: null,
  brandPrimaryColor: "#123047",
  brandAccentColor: "#2e7d32",
  brandFaviconUrl: null,
  brandFooterText: null,
  supportEmail: null,
  supportPhone: null,
  isTenantSite: false,
};

const TenantContext = createContext<TenantBranding>(defaultBranding);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data } = trpc.tenant.getBranding.useQuery();
  const branding = data ?? defaultBranding;

  return (
    <TenantContext.Provider value={branding}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantBranding {
  return useContext(TenantContext);
}
