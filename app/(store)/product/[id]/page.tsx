import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StorefrontShell } from '@/components/storefront';
import { getCatalogProductBySlug } from '@/lib/catalog/queries';
import { JsonLd } from '@/lib/seo/json-ld';
import { getSiteUrl } from '@/lib/seo/site-url';
import { formatPrice } from '@/lib/products';
import { scheduleState } from '@/lib/catalog/schedule';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProductBySlug(id);
  if (!product) {
    return { title: 'Product not found', robots: { index: false } };
  }
  const description = (
    product.tagline ||
    product.description ||
    `${product.name} digital subscription`
  ).slice(0, 160);
  const url = `/product/${product.id}`;
  const images = product.image
    ? [{ url: product.image, alt: product.name }]
    : undefined;
  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getCatalogProductBySlug(id);
  if (!product) notFound();

  const base = getSiteUrl();
  const low = product.plans.length
    ? Math.min(...product.plans.map((p) => p.price))
    : undefined;
  const sched = scheduleState(product);
  const high = product.plans.length
    ? Math.max(...product.plans.map((p) => p.price))
    : undefined;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.tagline || product.description,
          image: product.image ? [new URL(product.image, base).toString()] : undefined,
          sku: product.id,
          brand: { '@type': 'Brand', name: 'BitLogic' },
          offers:
            low != null
              ? {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'BDT',
                  lowPrice: low,
                  highPrice: high,
                  offerCount: product.plans.length,
                  availability: !sched.canOrder
                    ? sched.state === 'upcoming'
                      ? 'https://schema.org/PreOrder'
                      : 'https://schema.org/Discontinued'
                    : product.availability === 'out_of_stock' &&
                        !product.acceptOrdersWhenOutOfStock
                      ? 'https://schema.org/OutOfStock'
                      : 'https://schema.org/InStock',
                  ...(product.availableUntil ? { priceValidUntil: product.availableUntil } : {}),
                  url: `${base}/product/${product.id}`,
                }
              : undefined,
        }}
      />
      {/* Visible SSR fallback so crawlers see product facts without waiting on hydration. */}
      <noscript>
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1>{product.name}</h1>
          <p>{product.tagline || product.description}</p>
          {low != null ? <p>From {formatPrice(low)}</p> : null}
        </article>
      </noscript>
      <StorefrontShell />
    </>
  );
}
