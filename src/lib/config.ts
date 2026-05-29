// ============================================================
// Site Configuration — Single source of truth for domain
// ============================================================
// Vercel auto-issues SSL for the project subdomain (no "www.").
// If you add a custom domain in Vercel, set NEXT_PUBLIC_SITE_URL
// and Vercel handles the cert automatically.
// ============================================================

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://thesisforge-web.vercel.app";
