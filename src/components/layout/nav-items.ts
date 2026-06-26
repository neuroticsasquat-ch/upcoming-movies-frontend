import { SITE_NAME } from "@/lib/seo";

export const WORDMARK = SITE_NAME;

export const NAV_ITEMS = [
  { label: "Home", href: "/", enabled: true },
  { label: "Browse", href: "/browse", enabled: true },
  { label: "Search", href: "/search", enabled: false },
  { label: "Calendar", href: "/calendar", enabled: false },
] as const;
