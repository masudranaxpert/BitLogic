export type Category = 'AI' | 'STREAM' | 'WORK' | 'CREATE';

export type Plan = {
  id: string;
  label: string;
  duration: string;
  price: number;
  currency: string;
  warrantyBadge?: string;
  warrantyType?: 'warranty' | 'login-only';
  warrantyHeadline?: string;
  details?: string[];
};

export type Product = {
  id: string;
  name: string;
  code: Category;
  tagline: string;
  description: string;
  badge?: string;
  sale?: boolean;
  image: string;
  gallery: string[];
  platform: string;
  plans: Plan[];
  features: string[];
  featured?: boolean;
};

export const products: Product[] = [
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    code: 'AI',
    tagline: 'Priority GPT access for everyday work.',
    description:
      'Official ChatGPT Plus membership pass with priority access, GPT-4o, Canvas, and advanced reasoning models without waiting.',
    badge: 'Best seller',
    sale: true,
    image: '/products/chatgpt.jpg',
    gallery: ['/products/chatgpt.jpg', '/products/hero-person.jpg'],
    platform: 'OpenAI',
    featured: true,
    plans: [
      {
        id: 'cg-shared-1m',
        label: 'ChatGPT Plus Shared',
        duration: '1 Month',
        price: 450,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Full Replacement Warranty',
        details: [
          'Shared workspace account with instant login credentials.',
          'Log in using the provided email & password without changing credentials.',
          'Full GPT-4o, Canvas & reasoning access for 30 days.',
        ],
      },
      {
        id: 'cg-private-1m',
        label: 'ChatGPT Plus Private',
        duration: '1 Month',
        price: 1200,
        currency: 'BDT',
        warrantyBadge: '28D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '28 Days Private Account Warranty',
        details: [
          'Ready-made private account or activation on your personal email.',
          '100% private chat history and custom GPT workspace.',
          'Change the password after your first login.',
        ],
      },
      {
        id: 'cg-login-1m',
        label: 'ChatGPT Plus New',
        duration: '1 Month',
        price: 320,
        currency: 'BDT',
        warrantyBadge: 'Login Warranty Only',
        warrantyType: 'login-only',
        warrantyHeadline: 'No Warranty — Login Warranty Only',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
    ],
    features: ['Priority access during peak times', 'Advanced reasoning models', 'Faster response generation', 'Custom GPTs & Canvas'],
  },
  {
    id: 'gemini-advanced',
    name: 'Gemini Advanced',
    code: 'AI',
    tagline: 'Long-context Google AI in one seat.',
    description: 'Gemini Advanced pass with 2M token context window, deep multimodal research, and seamless Google Workspace integration.',
    image: '/products/gemini.jpg',
    gallery: ['/products/gemini.jpg', '/products/hero-person.jpg'],
    platform: 'Google',
    featured: true,
    plans: [
      {
        id: 'gm-jio-18m',
        label: 'Gemini Jio',
        duration: '18 Months',
        price: 1450,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Ready-made Google account activated with 18 Months Gemini Advanced + 2TB Storage.',
          'Log in using the provided email & password.',
          'Add your recovery email and change the password after first login.',
        ],
      },
      {
        id: 'gm-3-new-2m',
        label: 'Gemini 3 New',
        duration: '2 Months',
        price: 390,
        currency: 'BDT',
        warrantyBadge: 'Login Warranty Only',
        warrantyType: 'login-only',
        warrantyHeadline: 'No Warranty — Login Warranty Only',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
      {
        id: 'gm-pro-1m',
        label: 'Gemini Pro',
        duration: '1 Month',
        price: 290,
        currency: 'BDT',
        warrantyBadge: '10D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '10 Days Replacement Warranty',
        details: [
          'Ready-made account with Gemini Advanced + NotebookLM Plus enabled.',
          'Log in using the provided email & password.',
          '10 days full replacement support if any issue occurs.',
        ],
      },
    ],
    features: ['2M context window', 'Google Docs & Drive integration', 'High-speed image generation', 'Priority research model access'],
  },
  {
    id: 'claude-pro',
    name: 'Claude Pro',
    code: 'AI',
    tagline: 'Deep writing and coding companion.',
    description: 'Claude Pro membership for extended technical projects, Claude Artifacts, and 5x higher usage allowance.',
    image: '/products/claude.jpg',
    gallery: ['/products/claude.jpg'],
    platform: 'Anthropic',
    plans: [
      {
        id: 'cl-shared-1m',
        label: 'Claude Pro Shared',
        duration: '1 Month',
        price: 650,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Shared Claude Pro workspace with high daily message cap.',
          'Instant access via provided credentials.',
          'Do not change account email or security settings.',
        ],
      },
      {
        id: 'cl-private-1m',
        label: 'Claude Pro Private',
        duration: '1 Month',
        price: 1300,
        currency: 'BDT',
        warrantyBadge: '10D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '10 Days Replacement Warranty',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
    ],
    features: ['5x usage limits vs Free', 'Claude Artifacts interactive preview', 'High-context programming', 'Priority Claude 3.5 Sonnet'],
  },
  {
    id: 'netflix',
    name: 'Netflix 4K Ultra HD',
    code: 'STREAM',
    tagline: 'Films and series subscription pass.',
    description: 'Dedicated 4K Ultra HD PIN-locked profile for streaming your favorite global series and movies on any smart device.',
    badge: 'Popular',
    sale: true,
    image: '/products/netflix.jpg',
    gallery: ['/products/netflix.jpg', '/products/hero-stream.jpg'],
    platform: 'Netflix',
    featured: true,
    plans: [
      {
        id: 'nf-1screen-1m',
        label: 'Netflix 1 Screen PIN Locked',
        duration: '1 Month',
        price: 280,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Dedicated private PIN-locked 4K Ultra HD profile for 1 device.',
          'Log in using the provided email & password and select your assigned profile.',
          'Do not modify other profiles or account password.',
        ],
      },
      {
        id: 'nf-tv-1m',
        label: 'Netflix Smart TV + Mobile',
        duration: '1 Month',
        price: 390,
        currency: 'BDT',
        warrantyBadge: '28D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '28 Days Full Warranty',
        details: [
          'Supports Smart TV code sign-in, PC, and Mobile in 4K HDR.',
          'Instant household verification support via WhatsApp.',
          'Dedicated private profile with PIN lock.',
        ],
      },
    ],
    features: ['4K Ultra HD + Dolby Atmos', 'Dedicated private PIN profile', 'Offline download support', 'Smart TV, PC & Mobile support'],
  },
  {
    id: 'spotify',
    name: 'Spotify Premium',
    code: 'STREAM',
    tagline: 'Ad-free music membership.',
    description: 'High-fidelity audio listening pass with unlimited offline song downloads and zero advertisement interruptions.',
    image: '/products/spotify.jpg',
    gallery: ['/products/spotify.jpg'],
    platform: 'Spotify',
    featured: true,
    plans: [
      {
        id: 'sp-ind-1m',
        label: 'Spotify Individual',
        duration: '1 Month',
        price: 220,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
      {
        id: 'sp-new-2m',
        label: 'Spotify Premium New',
        duration: '2 Months',
        price: 350,
        currency: 'BDT',
        warrantyBadge: 'Login Warranty Only',
        warrantyType: 'login-only',
        warrantyHeadline: 'No Warranty — Login Warranty Only',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
      {
        id: 'sp-fam-3m',
        label: 'Spotify Invite Own Mail',
        duration: '3 Months',
        price: 650,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Activated directly on your personal Spotify account via invite link.',
          'Keep all your existing playlists and liked songs intact.',
          'Works worldwide without VPN after activation.',
        ],
      },
    ],
    features: ['100% Ad-free listening', 'Offline high-bitrate downloads', 'Unlimited track skips', 'Multi-device Spotify Connect'],
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    code: 'STREAM',
    tagline: 'Watch without ads.',
    description: 'Ad-free YouTube playback with background audio on locked phone screen and YouTube Music Premium included.',
    image: '/products/youtube.jpg',
    gallery: ['/products/youtube.jpg'],
    platform: 'Google',
    plans: [
      {
        id: 'yt-invite-1m',
        label: 'YouTube Invite Own Mail',
        duration: '1 Month',
        price: 180,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Family invite link sent directly to your personal Gmail.',
          'Includes YouTube Ad-free + YouTube Music Premium.',
          'No password required — accept the email invitation to activate.',
        ],
      },
      {
        id: 'yt-ready-2m',
        label: 'YouTube New Account',
        duration: '2 Months',
        price: 290,
        currency: 'BDT',
        warrantyBadge: 'Login Warranty Only',
        warrantyType: 'login-only',
        warrantyHeadline: 'No Warranty — Login Warranty Only',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
    ],
    features: ['Completely ad-free videos', 'Background play with screen locked', 'YouTube Music Premium included', 'Offline video downloads'],
  },
  {
    id: 'canva-pro',
    name: 'Canva Pro',
    code: 'CREATE',
    tagline: 'Pro design tools for social and brand work.',
    description: 'Full Canva Pro team access with Magic Studio AI, 100M+ premium stock assets, custom brand kits, and background remover.',
    sale: true,
    image: '/products/canva.jpg',
    gallery: ['/products/canva.jpg', '/products/hero-create.jpg'],
    platform: 'Canva',
    featured: true,
    plans: [
      {
        id: 'cv-own-1m',
        label: 'Canva Pro Own Mail',
        duration: '1 Month',
        price: 99,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Instant team invite sent directly to your personal Canva email.',
          'All your designs remain private inside your personal workspace.',
          'Includes Magic Studio AI & background remover.',
        ],
      },
      {
        id: 'cv-edu-12m',
        label: 'Canva Edu Pro',
        duration: '12 Months',
        price: 350,
        currency: 'BDT',
        warrantyBadge: '10D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '10 Days Replacement Warranty',
        details: [
          'Activated on your personal email address via verified classroom invite.',
          'Full premium asset library and high-res export access.',
          'Change or manage your account freely.',
        ],
      },
    ],
    features: ['Instant 1-click background remover', 'Brand Kit with custom fonts', 'Magic Studio AI generators', '100M+ photos, videos & audio'],
  },
  {
    id: 'notion-plus',
    name: 'Notion Plus',
    code: 'WORK',
    tagline: 'Unlimited workspace blocks.',
    description: 'Unlimited Notion workspace blocks, unlimited file upload capacity, 30-day page history, and custom workspace analytics.',
    image: '/products/notion.jpg',
    gallery: ['/products/notion.jpg'],
    platform: 'Notion',
    plans: [
      {
        id: 'nt-plus-1m',
        label: 'Notion Plus Ready Account',
        duration: '1 Month',
        price: 450,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
      {
        id: 'nt-edu-12m',
        label: 'Notion Plus Edu',
        duration: '12 Months',
        price: 1200,
        currency: 'BDT',
        warrantyBadge: 'Login Warranty Only',
        warrantyType: 'login-only',
        warrantyHeadline: 'No Warranty — Login Warranty Only',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
    ],
    features: ['Unlimited workspace blocks', 'Unlimited file uploads', '30-day revision version history', 'Custom workspace database views'],
  },
  {
    id: 'adobe-cc',
    name: 'Adobe Creative Cloud',
    code: 'CREATE',
    tagline: 'Photoshop, Premiere, full suite.',
    description: 'Full suite Adobe Creative Cloud all-apps subscription including Photoshop, Premiere Pro, Illustrator, After Effects, and 100GB Cloud.',
    image: '/products/adobe.jpg',
    gallery: ['/products/adobe.jpg', '/products/hero-create.jpg'],
    platform: 'Adobe',
    plans: [
      {
        id: 'ad-ready-1m',
        label: 'Adobe CC All Apps Ready',
        duration: '1 Month',
        price: 1250,
        currency: 'BDT',
        warrantyBadge: '25D Warranty',
        warrantyType: 'warranty',
        warrantyHeadline: '25 Days Replacement Warranty',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
      {
        id: 'ad-trial-14d',
        label: 'Adobe CC New',
        duration: '14 Days',
        price: 450,
        currency: 'BDT',
        warrantyBadge: 'Login Warranty Only',
        warrantyType: 'login-only',
        warrantyHeadline: 'No Warranty — Login Warranty Only',
        details: [
          'Ready-made account with login credentials provided.',
          'Log in using the provided email & password.',
          'Change the password after your first login.',
        ],
      },
    ],
    features: ['20+ desktop creative applications', '100GB high-speed Adobe cloud', 'Adobe Fonts library access', 'Generative Firefly credits included'],
  },
];

export const heroSlides = [
  {
    id: 'slide-chatgpt',
    productId: 'chatgpt-plus',
    title: 'ChatGPT Plus',
    image: '/products/hero-person.jpg',
  },
  {
    id: 'slide-stream',
    productId: 'netflix',
    title: 'Netflix 4K Ultra HD',
    image: '/products/hero-stream.jpg',
  },
  {
    id: 'slide-office',
    productId: 'canva-pro',
    title: 'Canva Pro Design',
    image: '/products/hero-create.jpg',
  },
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function formatPrice(amount: number, _currency = 'BDT') {
  void _currency;
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function priceRange(product: Product) {
  const amounts = product.plans.map((p) => p.price);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export function startingPrice(product: Product) {
  const min = Math.min(...product.plans.map((p) => p.price));
  return `${formatPrice(min)} থেকে শুরু`;
}

export function startingAmount(product: Product) {
  return Math.min(...product.plans.map((p) => p.price)).toLocaleString('en-BD');
}
