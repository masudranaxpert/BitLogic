import type { DigitalProduct } from '../lib/admin/types';
import {
  replaceCategories,
  replaceCredentialSchemes,
  replaceWarranties,
  saveDigitalProduct,
} from '../lib/admin/catalog-repo';

async function main() {
  await replaceCategories([
    { id: 'cat-ai', name: 'AI & LLM Tools', createdAt: '2026-01-12' },
    { id: 'cat-stream', name: 'Streaming & OTT', createdAt: '2026-01-12' },
    { id: 'cat-creative', name: 'Creative & Design', createdAt: '2026-02-03' },
  ]);

  await replaceWarranties([
    {
      id: 'wrn-25d',
      name: '25D Full',
      badge: '25D Warranty',
      headline: '25 Days Replacement Warranty',
      kind: 'warranty',
      days: 25,
    },
    {
      id: 'wrn-28d',
      name: '28D Private',
      badge: '28D Warranty',
      headline: '28 Days Private Account Warranty',
      kind: 'warranty',
      days: 28,
    },
    {
      id: 'wrn-login',
      name: 'Login only',
      badge: 'Login Warranty Only',
      headline: 'No Warranty: Login Warranty Only',
      kind: 'login-only',
      days: 0,
    },
  ]);

  await replaceCredentialSchemes([
    {
      id: 'cred-email-login',
      name: 'Email Login',
      fields: [
        { key: 'email', label: 'Email', required: true, planVisible: true },
        { key: 'password', label: 'Password', required: true, planVisible: true },
        { key: 'pin', label: 'PIN', required: false, planVisible: false },
      ],
    },
    {
      id: 'cred-token',
      name: 'Token',
      fields: [
        { key: 'token', label: 'Token', required: true, planVisible: true },
      ],
    },
  ]);

  const products: DigitalProduct[] = [
    {
      id: 'prd-chatgpt-plus',
      name: 'ChatGPT Plus',
      category: 'AI & LLM Tools',
      categoryId: 'cat-ai',
      sku: 'AI-CGP-001',
      imageUrl:
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
      ],
      status: 'active',
      shortDescription: 'Priority GPT access for everyday work.',
      description:
        'Official ChatGPT Plus with GPT-4o, Canvas, and advanced reasoning.',
      variants: [
        {
          id: 'var-cg-shared',
          productId: 'prd-chatgpt-plus',
          name: 'Shared',
          isDefault: true,
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 450,
          priceUSD: 3.91,
          credentialSchemeId: 'cred-email-login',
          credentialType: 'email_login',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: false,
          vpnRegionNote: '',
          hasWarranty: true,
          warrantyDays: 25,
          warrantyTerms: '25 Days Replacement Warranty',
          deviceLimit: '1 device',
          loginInstructions: [
            'Log in with the provided email and password.',
            'Do not change the account password.',
          ],
          importantNote: '25D Warranty',
        },
        {
          id: 'var-cg-private',
          productId: 'prd-chatgpt-plus',
          name: 'Private',
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 1200,
          priceUSD: 10.43,
          credentialSchemeId: 'cred-email-login',
          credentialType: 'email_login',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: false,
          vpnRegionNote: '',
          hasWarranty: true,
          warrantyDays: 28,
          warrantyTerms: '28 Days Private Account Warranty',
          deviceLimit: '1 device',
          loginInstructions: [
            'Log in with the provided email and password.',
            'You may change the password after first login.',
          ],
          importantNote: '28D Warranty',
        },
      ],
    },
    {
      id: 'prd-gemini-advanced',
      name: 'Gemini Advanced',
      category: 'AI & LLM Tools',
      categoryId: 'cat-ai',
      sku: 'AI-GEM-002',
      imageUrl:
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80',
      ],
      status: 'active',
      shortDescription: 'Google Gemini Advanced workspace.',
      description: 'Gemini Advanced with 1.5 Pro and Google app integrations.',
      variants: [
        {
          id: 'var-gm-pro',
          productId: 'prd-gemini-advanced',
          name: 'Pro 1 Month',
          isDefault: true,
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 900,
          priceUSD: 7.83,
          credentialSchemeId: 'cred-email-login',
          credentialType: 'email_login',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: false,
          vpnRegionNote: '',
          hasWarranty: true,
          warrantyDays: 25,
          warrantyTerms: '25 Days Replacement Warranty',
          deviceLimit: '1 device',
          loginInstructions: [
            'Log in with the provided email and password.',
            'Do not change the account password.',
          ],
          importantNote: '25D Warranty',
        },
      ],
    },
    {
      id: 'prd-netflix',
      name: 'Netflix 4K Ultra HD',
      category: 'Streaming & OTT',
      categoryId: 'cat-stream',
      sku: 'ST-NFX-001',
      imageUrl:
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80',
      ],
      status: 'active',
      shortDescription: 'Netflix 4K shared and private plans.',
      description: 'Watch in Ultra HD with profile slots and warranty support.',
      variants: [
        {
          id: 'var-nf-shared',
          productId: 'prd-netflix',
          name: 'Shared 4K',
          isDefault: true,
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 350,
          priceUSD: 3.04,
          credentialSchemeId: 'cred-email-login',
          credentialType: 'email_login',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: true,
          vpnRegionNote: 'US / SG',
          hasWarranty: true,
          warrantyDays: 25,
          warrantyTerms: '25 Days Replacement Warranty',
          deviceLimit: '1 profile',
          loginInstructions: [
            'Use the assigned profile only.',
            'Do not change email or password.',
          ],
          importantNote: '25D Warranty',
        },
        {
          id: 'var-nf-private',
          productId: 'prd-netflix',
          name: 'Private 4K',
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 900,
          priceUSD: 7.83,
          credentialSchemeId: 'cred-email-login',
          credentialType: 'email_login',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: false,
          vpnRegionNote: '',
          hasWarranty: true,
          warrantyDays: 28,
          warrantyTerms: '28 Days Private Account Warranty',
          deviceLimit: 'Full account',
          loginInstructions: [
            'Private account credentials delivered instantly.',
            'You may change the password after login.',
          ],
          importantNote: '28D Warranty',
        },
      ],
    },
    {
      id: 'prd-canva-pro',
      name: 'Canva Pro',
      category: 'Creative & Design',
      categoryId: 'cat-creative',
      sku: 'CR-CNV-001',
      imageUrl:
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
      ],
      status: 'active',
      shortDescription: 'Canva Pro for teams and creators.',
      description: 'Premium templates, Brand Kit, and background remover.',
      variants: [
        {
          id: 'var-cv-shared',
          productId: 'prd-canva-pro',
          name: 'Shared',
          isDefault: true,
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 250,
          priceUSD: 2.17,
          credentialSchemeId: 'cred-email-login',
          credentialType: 'email_login',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: false,
          vpnRegionNote: '',
          hasWarranty: true,
          warrantyDays: 25,
          warrantyTerms: '25 Days Replacement Warranty',
          deviceLimit: '1 seat',
          loginInstructions: [
            'Accept the team invite or use provided login.',
            'Do not remove other members.',
          ],
          importantNote: '25D Warranty',
        },
      ],
    },
    {
      id: 'prd-capcut-pro',
      name: 'CapCut Pro',
      category: 'Creative & Design',
      categoryId: 'cat-creative',
      sku: 'CR-CPC-001',
      imageUrl:
        'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
      galleryUrls: [
        'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
      ],
      status: 'active',
      shortDescription: 'Watermark-free CapCut Pro.',
      description: 'CapCut Pro for Reels, Shorts, and TikTok exports.',
      variants: [
        {
          id: 'var-cc-shared',
          productId: 'prd-capcut-pro',
          name: 'Shared',
          isDefault: true,
          durationDays: 30,
          durationLabel: '1 Month',
          priceBDT: 300,
          priceUSD: 2.61,
          credentialSchemeId: 'cred-token',
          credentialType: 'token',
          deliveryMode: 'auto_vault',
          stockDisplayMode: 'exact_count',
          vpnRequired: false,
          vpnRegionNote: '',
          hasWarranty: true,
          warrantyDays: 25,
          warrantyTerms: '25 Days Replacement Warranty',
          deviceLimit: '1 device',
          loginInstructions: [
            'Apply the access token when CapCut asks to sign in.',
            'Do not share the token publicly.',
          ],
          importantNote: '25D Warranty',
        },
      ],
    },
  ];

  for (const product of products) {
    await saveDigitalProduct(product);
    console.log(`Saved ${product.name}`);
  }

  console.log(`Done: ${products.length} products in DB.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
