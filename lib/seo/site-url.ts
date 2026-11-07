/** Absolute origin for metadataBase, sitemap, robots, and canonicals. */
export function getSiteUrl(): string {
  const env = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (env) return env;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}
