import { StorefrontShell } from '@/components/storefront';
import { JsonLd } from '@/lib/seo/json-ld';
import { getSiteUrl } from '@/lib/seo/site-url';
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
} from '@/lib/store-settings';

export default async function HomePage() {
  const s = await getStoreSettings();
  const base = getSiteUrl();
  const name = s.siteTitle.trim() || DEFAULT_STORE_SETTINGS.siteTitle;
  const description =
    s.siteDescription.trim() || DEFAULT_STORE_SETTINGS.siteDescription;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              name: 'Blumartbd',
              url: base,
              description,
            },
            {
              '@type': 'WebSite',
              name,
              url: base,
              description,
            },
          ],
        }}
      />
      <StorefrontShell />
    </>
  );
}
