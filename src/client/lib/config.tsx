/**
 * The server serializes `PublicConfig` into the HTML; both the SSR pass and the
 * hydrated app read it from this context, so no component imports
 * `site.config.ts` directly and plan IDs never need a build-time env var.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { PublicConfig, ResolvedOffering, ServiceDef } from "../../shared/types";

const ConfigContext = createContext<PublicConfig | null>(null);

export function ConfigProvider({
  value,
  children,
}: {
  value: PublicConfig;
  children: ReactNode;
}) {
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): PublicConfig {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used inside <ConfigProvider>");
  return ctx;
}

export function useSite() {
  return useConfig().site;
}

export function useOffering(key: string | undefined): ResolvedOffering | undefined {
  const { offerings } = useConfig();
  return offerings.find((o) => o.key === key);
}

export function useService(slug: string | undefined): ServiceDef | undefined {
  return useSite().services.find((s) => s.slug === slug);
}
