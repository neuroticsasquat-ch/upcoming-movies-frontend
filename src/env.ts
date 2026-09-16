export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "https://api.upmovies.localhost",
  publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://app.upmovies.localhost",
  tmdbImageBase: import.meta.env.VITE_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p",
  // Cloudflare Turnstile, the bot check on signup (NEU-1345, D-18). The fallback is
  // Cloudflare's documented always-passes test key, so dev and test render a real widget
  // that always solves without anyone provisioning a site key; the backend has a matching
  // TURNSTILE_SECRET bypass. Production sets this at build time — a site key is public by
  // design, the secret it pairs with never leaves the API.
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA",
} as const;
