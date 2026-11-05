import type {
  MediaAsset,
  DigitalProduct,
  VaultCredential,
  DigitalDelivery,
  SubscriberUser,
  PaymentTransaction,
  CouponCode,
  SystemFeatureFlag,
  AdminSupportTicket,
  AdminNotificationItem,
} from '@/lib/admin/types';

export const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: 'med-101',
    name: 'ChatGPT Plus Cover',
    fileName: 'chatgpt-plus-cover.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/chatgptplus/400/400',
    dimensions: '800 × 800',
    sizeKB: 84,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-12',
    usedByProduct: 'ChatGPT Plus',
  },
  {
    id: 'med-102',
    name: 'Cursor Pro IDE Cover',
    fileName: 'cursor-pro-ide.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/cursorpro/400/400',
    dimensions: '800 × 800',
    sizeKB: 92,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-14',
    usedByProduct: 'Cursor Pro',
  },
  {
    id: 'med-103',
    name: 'Netflix 4K UHD Cover',
    fileName: 'netflix-4k-uhd.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/netflixuhd/400/400',
    dimensions: '800 × 800',
    sizeKB: 110,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-15',
    usedByProduct: 'Netflix 4K UHD',
  },
  {
    id: 'med-104',
    name: 'NordVPN Complete Cover',
    fileName: 'nordvpn-complete.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/nordvpnsec/400/400',
    dimensions: '800 × 800',
    sizeKB: 76,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-18',
    usedByProduct: 'NordVPN Complete',
  },
  {
    id: 'med-105',
    name: 'Windows 11 Pro Retail Box',
    fileName: 'win11-pro-key.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/win11pro/400/400',
    dimensions: '800 × 800',
    sizeKB: 68,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-20',
    usedByProduct: 'Windows 11 Pro',
  },
  {
    id: 'med-106',
    name: 'Token Injector Extension Guide',
    fileName: 'token-injector-step1.png',
    folder: 'Login Guides',
    url: 'https://picsum.photos/seed/tokenguide/400/400',
    dimensions: '1280 × 720',
    sizeKB: 145,
    mimeType: 'image/png',
    uploadedAt: '2026-10-22',
  },
  {
    id: 'med-107',
    name: 'Midjourney Pro Cover',
    fileName: 'midjourney-v6-cover.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/midjourneyv6/400/400',
    dimensions: '800 × 800',
    sizeKB: 98,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-25',
  },
  {
    id: 'med-108',
    name: 'Canva Pro Team Icon',
    fileName: 'canva-pro-icon.png',
    folder: 'Brand Icons',
    url: 'https://picsum.photos/seed/canvapro/400/400',
    dimensions: '512 × 512',
    sizeKB: 42,
    mimeType: 'image/png',
    uploadedAt: '2026-10-27',
  },
  {
    id: 'med-109',
    name: 'Claude 3.7 Sonnet Cover',
    fileName: 'claude-sonnet-pro.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/claudesonnet/400/400',
    dimensions: '800 × 800',
    sizeKB: 89,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-28',
  },
  {
    id: 'med-110',
    name: 'Spotify Premium Duo Cover',
    fileName: 'spotify-duo-cover.webp',
    folder: 'Product Covers',
    url: 'https://picsum.photos/seed/spotifyduo/400/400',
    dimensions: '800 × 800',
    sizeKB: 74,
    mimeType: 'image/webp',
    uploadedAt: '2026-10-29',
  },
  {
    id: 'med-111',
    name: 'OTP Verification Bot Guide',
    fileName: 'otp-bot-guide.png',
    folder: 'Login Guides',
    url: 'https://picsum.photos/seed/otpbotguide/400/400',
    dimensions: '1280 × 720',
    sizeKB: 132,
    mimeType: 'image/png',
    uploadedAt: '2026-10-29',
  },
  {
    id: 'med-112',
    name: 'GitHub Copilot Pro Icon',
    fileName: 'github-copilot-icon.png',
    folder: 'Brand Icons',
    url: 'https://picsum.photos/seed/ghcopilot/400/400',
    dimensions: '512 × 512',
    sizeKB: 51,
    mimeType: 'image/png',
    uploadedAt: '2026-10-30',
  },
];

export const INITIAL_PRODUCTS: DigitalProduct[] = [
  {
    id: 'prod-chatgpt-plus',
    name: 'ChatGPT Plus',
    category: 'AI & LLM Tools',
    sku: 'BL-AI-GPT4O',
    imageUrl: 'https://picsum.photos/seed/chatgptplus/400/400',
    galleryUrls: [
      'https://picsum.photos/seed/chatgptplus/400/400',
      'https://picsum.photos/seed/tokenguide/400/400',
    ],
    status: 'active',
    shortDescription: 'GPT-4o & o3-mini access via session token, shared login, or private invite.',
    description:
      '[notice]Instant delivery from BitLogic Auto-Vault 24/7.[/notice]\nUnlock full [b]ChatGPT Plus[/b] capabilities including GPT-4o, o3-mini reasoning, DALL-E 3 image generation, and Advanced Data Analysis.',
    descriptionMode: 'per_option',
    totalSales: 482,
    monthlyRevenueBDT: 368500,
    variants: [
      {
        id: 'var-gpt-token-1m',
        productId: 'prod-chatgpt-plus',
        name: '1M Access Token',
        isDefault: true,
        durationDays: 30,
        durationLabel: '30 Days',
        priceBDT: 450,
        priceUSD: 3.99,
        credentialType: 'token',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Direct login via Token Helper extension.',
        hasWarranty: true,
        warrantyDays: 30,
        warrantyTerms: '30-day replacement guarantee if token expires early.',
        deviceLimit: '1 PC Browser',
        loginInstructions: [
          'Install the Access Token Helper extension on Chrome or Edge.',
          'Open chatgpt.com and click the extension icon.',
          'Paste your Access Token string and click Inject Session.',
          'Close the browser tab when finished instead of clicking Log Out.'
        ],
        importantNote: 'Clicking Log Out invalidates the shared token.',
        warningNote:
          '[warning]Do NOT click "Log Out" inside ChatGPT — clicking Log Out revokes the session token for the node. Simply close the browser tab when done.[/warning]',
        optionDescription:
          'Best budget option for PC Chrome/Edge users. Uses a pre-authenticated [code]Access Token[/code] with 1-click browser injection.',
        specifications: [
          { label: 'Delivery Mode', value: 'Instant (Auto-Vault)' },
          { label: 'Login Method', value: 'Chrome/Edge Token Extension' },
          { label: 'Device Limit', value: '1 PC Browser' },
          { label: 'VPN Requirement', value: 'No VPN Required' },
          { label: 'Warranty', value: '30 Days Replacement' },
        ],
      },
      {
        id: 'var-gpt-email-1m',
        productId: 'prod-chatgpt-plus',
        name: '1M Shared Login',
        durationDays: 30,
        durationLabel: '30 Days',
        priceBDT: 650,
        priceUSD: 5.50,
        credentialType: 'email_login',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'No VPN required on iOS, Android, or PC.',
        hasWarranty: true,
        warrantyDays: 30,
        warrantyTerms: '30-day warranty. Do not change password or 2FA settings.',
        deviceLimit: '1 Mobile + 1 PC',
        loginInstructions: [
          'Go to chatgpt.com/auth/login and continue with Email.',
          'Enter the delivered Email and Password.',
          'Fetch the 6-digit OTP code using your Order ID.'
        ],
        importantNote: 'Do not modify workspace password.',
        warningNote:
          '[warning]Do NOT attempt to change the account password or 2FA settings. Violating this rule voids your 30-day warranty.[/warning]',
        optionDescription:
          'Works on both Official Mobile App (iOS/Android) and Desktop Browser using direct [b]Email + Password[/b] login.',
        specifications: [
          { label: 'Delivery Mode', value: 'Instant (Auto-Vault)' },
          { label: 'Login Method', value: 'Email + Password + OTP Bot' },
          { label: 'Device Limit', value: '1 Mobile + 1 PC' },
          { label: 'VPN Requirement', value: 'No VPN Required' },
          { label: 'Warranty', value: '30 Days Replacement' },
        ],
      },
      {
        id: 'var-gpt-private-invite',
        productId: 'prod-chatgpt-plus',
        name: '1M Private Invite',
        durationDays: 30,
        durationLabel: '30 Days',
        priceBDT: 1250,
        priceUSD: 10.99,
        credentialType: 'invite_link',
        deliveryMode: 'manual_dispatch',
        stockDisplayMode: 'status_only',
        vpnRequired: false,
        vpnRegionNote: 'Workspace invite sent to personal email.',
        hasWarranty: true,
        warrantyDays: 30,
        warrantyTerms: '30-day full replacement warranty.',
        deviceLimit: 'Unlimited Devices',
        loginInstructions: [
          'Open the OpenAI Team Workspace invitation link.',
          'Sign in with your personal OpenAI account.',
          'Select BitLogic Workspace from the profile menu.'
        ],
        importantNote: 'Chats remain private to your personal email.',
        warningNote:
          '[notice]100% Private Workspace on your own email address. Your chat history is never visible to anyone else.[/notice]',
        optionDescription:
          'Private OpenAI Team Workspace seat delivered directly to your personal email address.',
        specifications: [
          { label: 'Delivery Mode', value: 'Team Invite (15–30 mins)' },
          { label: 'Privacy', value: '100% Private Chat History' },
          { label: 'Device Limit', value: 'Unlimited Personal Devices' },
          { label: 'VPN Requirement', value: 'No VPN Required' },
          { label: 'Warranty', value: '30 Days Full Warranty' },
        ],
      }
    ]
  },
  {
    id: 'prod-cursor-pro',
    name: 'Cursor Pro',
    category: 'Developer & Cloud',
    sku: 'BL-DEV-CURSOR',
    imageUrl: 'https://picsum.photos/seed/cursorpro/400/400',
    status: 'active',
    shortDescription: '500 fast Claude Sonnet & GPT-4o requests per month.',
    description:
      'Official [b]Cursor Pro[/b] AI code editor subscription with 500 fast premium requests (Claude 3.7 Sonnet, GPT-4o, o3-mini) and unlimited slow completions.',
    descriptionMode: 'per_option',
    totalSales: 318,
    monthlyRevenueBDT: 286200,
    variants: [
      {
        id: 'var-cursor-private-1m',
        productId: 'prod-cursor-pro',
        name: '1M Private Account',
        isDefault: true,
        durationDays: 30,
        durationLabel: '30 Days',
        priceBDT: 950,
        priceUSD: 8.50,
        credentialType: 'email_login',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Direct connection without VPN.',
        hasWarranty: true,
        warrantyDays: 30,
        warrantyTerms: '30-day warranty on Pro subscription status.',
        deviceLimit: '2 Machines',
        loginInstructions: [
          'Open Cursor IDE > Settings > Account and click Sign In.',
          'Sign in with the delivered Email and Password.',
          'Keep Usage-Based Pricing disabled.'
        ],
        importantNote: '500 fast requests included.',
        warningNote:
          '[warning]Keep "Usage-Based Pricing" turned OFF inside Cursor Settings. Only use the included 500 fast requests + unlimited slow requests.[/warning]',
        optionDescription: 'Dedicated private account with full 500 fast request quota.',
        specifications: [
          { label: 'Fast Quota', value: '500 Fast Requests / Month' },
          { label: 'Models', value: 'Claude 3.7 Sonnet & GPT-4o' },
          { label: 'Device Limit', value: 'Up to 2 Machines' },
          { label: 'VPN Requirement', value: 'No VPN Required' },
          { label: 'Warranty', value: '30 Days Full Warranty' },
        ],
      },
      {
        id: 'var-cursor-token-1m',
        productId: 'prod-cursor-pro',
        name: '1M Session Token',
        durationDays: 30,
        durationLabel: '30 Days',
        priceBDT: 550,
        priceUSD: 4.90,
        credentialType: 'token',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: true,
        vpnRegionNote: 'SG or US VPN required during initial login.',
        hasWarranty: true,
        warrantyDays: 15,
        warrantyTerms: '15-day replacement warranty via Vault.',
        deviceLimit: '1 Machine',
        loginInstructions: [
          'Connect to a Singapore or US VPN server.',
          'Open Cursor Token Injector and paste your token.',
          'Restart Cursor IDE.'
        ],
        importantNote: 'Disconnect VPN after initial sign-in.',
        warningNote:
          '[warning]Connect to a Singapore or US VPN before injecting the token for the first time.[/warning]',
        optionDescription: 'Shared Pro session token for 1 machine.',
        specifications: [
          { label: 'Delivery Mode', value: 'Instant Token (Auto-Vault)' },
          { label: 'Device Limit', value: '1 Machine' },
          { label: 'VPN Requirement', value: 'SG/US VPN on Initial Login' },
          { label: 'Warranty', value: '15 Days Replacement' },
        ],
      }
    ]
  },
  {
    id: 'prod-netflix-uhd',
    name: 'Netflix 4K UHD',
    category: 'Streaming & OTT',
    sku: 'BL-OTT-NFLX4K',
    imageUrl: 'https://picsum.photos/seed/netflixuhd/400/400',
    status: 'active',
    shortDescription: 'Ultra HD 4K streaming with a PIN-locked personal profile.',
    description:
      'Stream in 4K Ultra HD + HDR with your own PIN-protected profile slot.',
    descriptionMode: 'per_option',
    totalSales: 645,
    monthlyRevenueBDT: 245100,
    variants: [
      {
        id: 'var-nflx-1m-pin',
        productId: 'prod-netflix-uhd',
        name: '1M PIN Profile',
        isDefault: true,
        durationDays: 30,
        durationLabel: '30 Days',
        priceBDT: 380,
        priceUSD: 3.20,
        credentialType: 'email_login',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Region-free Ultra HD playback.',
        hasWarranty: true,
        warrantyDays: 30,
        warrantyTerms: '30-day warranty. Do not change profile PIN.',
        deviceLimit: '1 Screen',
        loginInstructions: [
          'Sign in to Netflix with Email and Password.',
          'Select your assigned Profile and enter the 4-digit PIN.'
        ],
        importantNote: 'Stream on 1 screen at a time.',
        warningNote:
          '[warning]Only use your assigned Profile Slot and do NOT edit other profiles or change the account password.[/warning]',
        optionDescription: '1-month PIN-protected 4K UHD profile for 1 screen.',
        specifications: [
          { label: 'Resolution', value: '4K Ultra HD + HDR' },
          { label: 'Profile Lock', value: 'Dedicated 4-Digit PIN' },
          { label: 'Simultaneous Screens', value: '1 Screen' },
          { label: 'VPN Requirement', value: 'No VPN (BD Supported)' },
          { label: 'Warranty', value: '30 Days Full Warranty' },
        ],
      },
      {
        id: 'var-nflx-6m-pin',
        productId: 'prod-netflix-uhd',
        name: '6M PIN Profile',
        durationDays: 180,
        durationLabel: '180 Days',
        priceBDT: 2100,
        priceUSD: 17.99,
        credentialType: 'email_login',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Direct playback without VPN.',
        hasWarranty: true,
        warrantyDays: 180,
        warrantyTerms: '180-day full replacement warranty.',
        deviceLimit: '1 Screen',
        loginInstructions: [
          'Sign in with Email and Password.',
          'Unlock your profile slot with the 4-digit PIN.'
        ],
        importantNote: 'Same account renewed for 6 months.',
        warningNote:
          '[notice]Auto-renewed 6-month master account so your watchlist stays intact.[/notice]',
        optionDescription: '6-month continuous PIN profile with 180 days warranty.',
        specifications: [
          { label: 'Resolution', value: '4K Ultra HD + HDR' },
          { label: 'Duration', value: '180 Days (No Monthly Change)' },
          { label: 'Simultaneous Screens', value: '1 Screen' },
          { label: 'Warranty', value: '180 Days Replacement' },
        ],
      }
    ]
  },
  {
    id: 'prod-nordvpn-ult',
    name: 'NordVPN Complete',
    category: 'VPN & Security',
    sku: 'BL-SEC-NORD',
    imageUrl: 'https://picsum.photos/seed/nordvpnsec/400/400',
    status: 'active',
    shortDescription: '60+ country NordLynx servers via key or account login.',
    description: 'High-speed NordLynx WireGuard VPN access across 60+ countries.',
    descriptionMode: 'per_option',
    totalSales: 290,
    monthlyRevenueBDT: 142000,
    variants: [
      {
        id: 'var-nord-1y-login',
        productId: 'prod-nordvpn-ult',
        name: '1Y Shared Login',
        isDefault: true,
        durationDays: 365,
        durationLabel: '365 Days',
        priceBDT: 790,
        priceUSD: 6.99,
        credentialType: 'email_login',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: true,
        vpnRegionNote: 'Use WARP 1.1.1.1 during initial login.',
        hasWarranty: true,
        warrantyDays: 365,
        warrantyTerms: '365-day replacement warranty.',
        deviceLimit: '2 Devices',
        loginInstructions: [
          'Open NordVPN app and click Log In.',
          'Sign in with the delivered Email and Password.',
          'Switch protocol to NordLynx.'
        ],
        importantNote: 'Max 2 active devices per order.',
        warningNote:
          '[warning]Do not connect more than 2 devices simultaneously on the shared plan.[/warning]',
        optionDescription: '1-Year shared account login supporting up to 2 devices.',
        specifications: [
          { label: 'Protocol', value: 'NordLynx (WireGuard)' },
          { label: 'Device Limit', value: '2 Devices' },
          { label: 'Initial Login', value: 'Use 1.1.1.1 WARP once' },
          { label: 'Warranty', value: '365 Days Replacement' },
        ],
      },
      {
        id: 'var-nord-1y-key',
        productId: 'prod-nordvpn-ult',
        name: '1Y Retail Key',
        durationDays: 365,
        durationLabel: '365 Days',
        priceBDT: 2950,
        priceUSD: 25.00,
        credentialType: 'license_key',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Redeem on nordaccount.com without VPN.',
        hasWarranty: true,
        warrantyDays: 365,
        warrantyTerms: '1-year official key warranty.',
        deviceLimit: '10 Devices',
        loginInstructions: [
          'Visit my.nordaccount.com/activate.',
          'Enter the 16-digit retail Activation Key.'
        ],
        importantNote: 'Binds to your personal NordAccount.',
        warningNote:
          '[notice]Activates directly on your personal NordAccount email for all 10 device slots.[/notice]',
        optionDescription: 'Official retail activation key for your personal account.',
        specifications: [
          { label: 'Activation', value: 'Official Retail Key' },
          { label: 'Device Limit', value: '10 Devices (Full Account)' },
          { label: 'VPN Requirement', value: 'No VPN Required' },
          { label: 'Warranty', value: '365 Days Official' },
        ],
      }
    ]
  },
  {
    id: 'prod-win11-pro',
    name: 'Windows 11 Pro',
    category: 'OS & Office Keys',
    sku: 'BL-OS-WIN11P',
    imageUrl: 'https://picsum.photos/seed/win11pro/400/400',
    status: 'active',
    shortDescription: 'Microsoft Retail 25-character digital license key.',
    description: 'Genuine 25-character Retail Product Key for Windows 11 Pro.',
    descriptionMode: 'global',
    totalSales: 520,
    monthlyRevenueBDT: 234000,
    variants: [
      {
        id: 'var-win11-retail-life',
        productId: 'prod-win11-pro',
        name: 'Lifetime Retail Key',
        isDefault: true,
        durationDays: 3650,
        durationLabel: 'Lifetime',
        priceBDT: 490,
        priceUSD: 4.25,
        credentialType: 'license_key',
        deliveryMode: 'auto_vault',
        stockDisplayMode: 'exact_count',
        vpnRequired: false,
        vpnRegionNote: 'Global online activation without VPN.',
        hasWarranty: true,
        warrantyDays: 365,
        warrantyTerms: 'Lifetime activation on 1 PC.',
        deviceLimit: '1 PC',
        loginInstructions: [
          'Open Settings > System > Activation.',
          'Click Change Product Key and enter your 25-digit key.'
        ],
        importantNote: 'Links permanently to motherboard.',
        warningNote:
          '[notice]Supports Windows 11 Pro fresh install or upgrade from Windows 11 Home.[/notice]',
        optionDescription: 'Permanent retail activation linked to your Microsoft account.',
        specifications: [
          { label: 'Key Type', value: '25-Digit Retail License' },
          { label: 'Device Limit', value: '1 PC (Transferable Retail)' },
          { label: 'Activation', value: 'Online Global Activation' },
          { label: 'Warranty', value: 'Lifetime Activation' },
        ],
      }
    ]
  }
];

export const INITIAL_VAULT_CREDENTIALS: VaultCredential[] = [
  {
    id: 'vlt-1001',
    productId: 'prod-chatgpt-plus',
    productName: 'ChatGPT Plus',
    variantId: 'var-gpt-token-1m',
    variantName: '1M Access Token',
    credentialType: 'token',
    secretValue: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_SESS_99481A_77C2_LIVE_TOKEN_X92',
    noteBBCode: '[warning]Do NOT click Log Out inside ChatGPT. Close the tab instead.[/warning]',
    status: 'available',
    batchNote: 'Batch #42',
    addedAt: '2026-10-29 14:20'
  },
  {
    id: 'vlt-1002',
    productId: 'prod-chatgpt-plus',
    productName: 'ChatGPT Plus',
    variantId: 'var-gpt-token-1m',
    variantName: '1M Access Token',
    credentialType: 'token',
    secretValue: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_SESS_88319B_41F9_LIVE_TOKEN_K14',
    noteBBCode: '[warning]Do NOT click Log Out inside ChatGPT. Close the tab instead.[/warning]',
    status: 'available',
    batchNote: 'Batch #42',
    addedAt: '2026-10-29 14:20'
  },
  {
    id: 'vlt-1003',
    productId: 'prod-chatgpt-plus',
    productName: 'ChatGPT Plus',
    variantId: 'var-gpt-email-1m',
    variantName: '1M Shared Login',
    credentialType: 'email_login',
    secretValue: 'plus-node04@bitlogic-vault.io | Pass#Gpt9921!',
    email: 'plus-node04@bitlogic-vault.io',
    password: 'Pass#Gpt9921!',
    profilePin: 'Node #04',
    noteBBCode: '[warning]Do not change workspace password or 2FA settings.[/warning]',
    status: 'available',
    batchNote: 'Node 04',
    addedAt: '2026-10-28 09:15'
  },
  {
    id: 'vlt-1004',
    productId: 'prod-cursor-pro',
    productName: 'Cursor Pro',
    variantId: 'var-cursor-private-1m',
    variantName: '1M Private Account',
    credentialType: 'email_login',
    secretValue: 'dev.pro.77@bitlogic-labs.io | Cursor#Pro8841',
    email: 'dev.pro.77@bitlogic-labs.io',
    password: 'Cursor#Pro8841',
    profilePin: '500 Quota',
    noteBBCode: '[notice]Keep Usage-Based Pricing turned OFF in Cursor Settings.[/notice]',
    status: 'available',
    batchNote: 'Oct Batch',
    addedAt: '2026-10-29 18:00'
  },
  {
    id: 'vlt-1005',
    productId: 'prod-cursor-pro',
    productName: 'Cursor Pro',
    variantId: 'var-cursor-token-1m',
    variantName: '1M Session Token',
    credentialType: 'token',
    secretValue: 'cur_sess_live_98a77b6c5d4e3f2a1b0c9d8e7f6a5b4c_SG_NODE',
    noteBBCode: '[warning]Connect to Singapore VPN during initial token injection.[/warning]',
    status: 'available',
    batchNote: 'SG Pool',
    addedAt: '2026-10-29 19:30'
  },
  {
    id: 'vlt-1006',
    productId: 'prod-netflix-uhd',
    productName: 'Netflix 4K UHD',
    variantId: 'var-nflx-1m-pin',
    variantName: '1M PIN Profile',
    credentialType: 'email_login',
    secretValue: 'uhd.master19@bitlogic-stream.com | Nflx#4K902',
    email: 'uhd.master19@bitlogic-stream.com',
    password: 'Nflx#4K902',
    profilePin: 'Slot-3 | PIN: 5820',
    noteBBCode: '[warning]Use only Profile Slot-3 (PIN: 5820). Do not edit other profiles.[/warning]',
    status: 'available',
    batchNote: 'Plan #19',
    addedAt: '2026-10-27 11:00'
  },
  {
    id: 'vlt-1007',
    productId: 'prod-win11-pro',
    productName: 'Windows 11 Pro',
    variantId: 'var-win11-retail-life',
    variantName: 'Lifetime Retail Key',
    credentialType: 'license_key',
    secretValue: 'VK7JG-NPHTM-C97JM-9MPGT-3V66T',
    status: 'available',
    batchNote: 'Retail Q4',
    addedAt: '2026-10-25 16:40'
  },
  {
    id: 'vlt-1008',
    productId: 'prod-nordvpn-ult',
    productName: 'NordVPN Complete',
    variantId: 'var-nord-1y-login',
    variantName: '1Y Shared Login',
    credentialType: 'email_login',
    secretValue: 'nord.sec.08@bitlogic-vault.io | Nord#Lynx773',
    email: 'nord.sec.08@bitlogic-vault.io',
    password: 'Nord#Lynx773',
    profilePin: '2 Devices',
    status: 'delivered',
    batchNote: 'Annual Pool',
    addedAt: '2026-10-20 10:10',
    assignedOrderId: 'ORD-88204',
    assignedBuyerEmail: 'tanvir.ahmed@gmail.com'
  }
];

export const INITIAL_DELIVERIES: DigitalDelivery[] = [
  {
    id: 'DLV-9048',
    orderId: 'ORD-88219',
    createdAt: '2026-10-30 01:42',
    buyerName: 'Rafiqul Islam',
    buyerEmail: 'rafiq.dev@gmail.com',
    buyerPhone: '+880 1712-884920',
    productId: 'prod-chatgpt-plus',
    productName: 'ChatGPT Plus',
    variantId: 'var-gpt-private-invite',
    variantName: '1M Private Invite',
    credentialType: 'invite_link',
    deliveryMode: 'manual_dispatch',
    status: 'pending_dispatch',
    credentialPayload: {
      secretValue: ''
    },
    vpnRequired: false,
    vpnRegionNote: 'Workspace invite sent to personal email.',
    hasWarranty: true,
    warrantyDays: 30,
    warrantyRemainingDays: 30,
    warrantyTerms: '30-day full replacement warranty.',
    replacementHistoryCount: 0,
    loginInstructions: [
      'Open the OpenAI Team Workspace invitation link.',
      'Sign in with your personal OpenAI account.',
      'Select BitLogic Workspace from the profile switcher.'
    ],
    customAdminNote: '[notice]Invite requested for rafiq.dev@gmail.com.[/notice]',
    unreadChatCount: 1,
    chatMessages: [
      {
        id: 'ochat-1',
        sender: 'customer',
        senderName: 'Rafiqul Islam',
        text: 'Hello, I completed payment via bKash (BKX99482KL). Please send the ChatGPT Plus invite to rafiq.dev@gmail.com.',
        time: '10:14 AM'
      },
      {
        id: 'ochat-2',
        sender: 'admin',
        senderName: 'Support Admin',
        text: 'Payment verified! Your email rafiq.dev@gmail.com is queued for workspace invite dispatch.',
        time: '10:18 AM'
      },
      {
        id: 'ochat-3',
        sender: 'customer',
        senderName: 'Rafiqul Islam',
        text: 'Great, please let me know here once the invitation email is sent.',
        time: '10:22 AM'
      }
    ]
  },
  {
    id: 'DLV-9047',
    orderId: 'ORD-88215',
    createdAt: '2026-10-29 22:18',
    deliveredAt: '2026-10-29 22:18',
    buyerName: 'Nusrat Jahan',
    buyerEmail: 'nusrat.ux@outlook.com',
    buyerPhone: '+880 1819-330192',
    productId: 'prod-chatgpt-plus',
    productName: 'ChatGPT Plus',
    variantId: 'var-gpt-token-1m',
    variantName: '1M Access Token',
    credentialType: 'token',
    deliveryMode: 'auto_vault',
    status: 'warranty_claim',
    credentialPayload: {
      secretValue: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.BL_GPT4O_SESS_44102OLD_REVOKED_91'
    },
    vpnRequired: false,
    vpnRegionNote: 'Direct login via Token Helper extension.',
    hasWarranty: true,
    warrantyDays: 30,
    warrantyRemainingDays: 24,
    warrantyTerms: '30-day replacement guarantee.',
    warrantyClaimReason: 'Token session expired (401)',
    replacementHistoryCount: 0,
    loginInstructions: [
      'Install Access Token Helper extension.',
      'Open chatgpt.com and inject your token.'
    ],
    customAdminNote: '[warning]Do NOT click Log Out inside ChatGPT. Close the tab instead.[/warning]',
    unreadChatCount: 1,
    chatMessages: [
      {
        id: 'ochat-4',
        sender: 'customer',
        senderName: 'Nusrat Jahan',
        text: 'My access token started showing 401 session expired this morning. Can you replace it from the vault?',
        time: '09:45 AM'
      }
    ]
  },
  {
    id: 'DLV-9046',
    orderId: 'ORD-88212',
    createdAt: '2026-10-29 19:05',
    deliveredAt: '2026-10-29 19:05',
    buyerName: 'Mehedi Hasan',
    buyerEmail: 'shuvo.fullstack@gmail.com',
    buyerPhone: '+880 1911-548291',
    productId: 'prod-cursor-pro',
    productName: 'Cursor Pro',
    variantId: 'var-cursor-private-1m',
    variantName: '1M Private Account',
    credentialType: 'email_login',
    deliveryMode: 'auto_vault',
    status: 'delivered',
    credentialPayload: {
      secretValue: 'dev.pro.64@bitlogic-labs.io | Cursor#Pro6419',
      email: 'dev.pro.64@bitlogic-labs.io',
      password: 'Cursor#Pro6419',
      profilePin: '500 Fast Quota'
    },
    vpnRequired: false,
    vpnRegionNote: 'Direct connection without VPN.',
    hasWarranty: true,
    warrantyDays: 30,
    warrantyRemainingDays: 29,
    warrantyTerms: '30-day warranty.',
    replacementHistoryCount: 0,
    loginInstructions: [
      'Open Cursor IDE > Settings > Account.',
      'Sign in with Email and Password.'
    ],
    customAdminNote: '[warning]Keep Usage-Based Pricing disabled in Cursor Settings.[/warning]',
    unreadChatCount: 0,
    chatMessages: [
      {
        id: 'ochat-5',
        sender: 'admin',
        senderName: 'Support Admin',
        text: 'Your Cursor Pro 1M Private Account credentials have been delivered. Enjoy!',
        time: 'Yesterday'
      },
      {
        id: 'ochat-6',
        sender: 'customer',
        senderName: 'Mehedi Hasan',
        text: 'Logged in smoothly, Claude 3.5 Sonnet fast requests are working. Thanks!',
        time: 'Yesterday'
      }
    ]
  },
  {
    id: 'DLV-9045',
    orderId: 'ORD-88208',
    createdAt: '2026-10-28 16:30',
    deliveredAt: '2026-10-28 16:31',
    buyerName: 'Sabbir Rahman',
    buyerEmail: 'sabbir.cine@gmail.com',
    buyerPhone: '+880 1675-992014',
    productId: 'prod-netflix-uhd',
    productName: 'Netflix 4K UHD',
    variantId: 'var-nflx-1m-pin',
    variantName: '1M PIN Profile',
    credentialType: 'email_login',
    deliveryMode: 'auto_vault',
    status: 'delivered',
    credentialPayload: {
      secretValue: 'uhd.master14@bitlogic-stream.com | Nflx#4K771',
      email: 'uhd.master14@bitlogic-stream.com',
      password: 'Nflx#4K771',
      profilePin: 'Slot-2 | PIN: 3914'
    },
    vpnRequired: false,
    vpnRegionNote: 'Region-free playback.',
    hasWarranty: true,
    warrantyDays: 30,
    warrantyRemainingDays: 28,
    warrantyTerms: '30-day warranty.',
    replacementHistoryCount: 0,
    loginInstructions: [
      'Sign in to Netflix with Email and Password.',
      'Select Slot-2 and enter PIN 3914.'
    ],
    customAdminNote: '[warning]Use only Slot-2 (PIN: 3914). Do not change account password.[/warning]'
  },
  {
    id: 'DLV-9044',
    orderId: 'ORD-88204',
    createdAt: '2026-10-20 10:12',
    deliveredAt: '2026-10-20 10:12',
    buyerName: 'Tanvir Ahmed',
    buyerEmail: 'tanvir.ahmed@gmail.com',
    buyerPhone: '+880 1755-129834',
    productId: 'prod-nordvpn-ult',
    productName: 'NordVPN Complete',
    variantId: 'var-nord-1y-login',
    variantName: '1Y Shared Login',
    credentialType: 'email_login',
    deliveryMode: 'auto_vault',
    status: 'replaced',
    credentialPayload: {
      secretValue: 'nord.sec.08@bitlogic-vault.io | Nord#Lynx773',
      email: 'nord.sec.08@bitlogic-vault.io',
      password: 'Nord#Lynx773',
      profilePin: '2 Devices'
    },
    vpnRequired: true,
    vpnRegionNote: 'Use WARP 1.1.1.1 during initial login.',
    hasWarranty: true,
    warrantyDays: 365,
    warrantyRemainingDays: 355,
    warrantyTerms: '365-day replacement warranty.',
    replacementHistoryCount: 1,
    loginInstructions: [
      'Open NordVPN app and sign in.',
      'Set protocol to NordLynx.'
    ],
    customAdminNote: '[notice]Replaced once on Oct 24 under 365d warranty.[/notice]'
  },
  {
    id: 'DLV-9043',
    orderId: 'ORD-88199',
    createdAt: '2026-10-25 14:10',
    deliveredAt: '2026-10-25 14:10',
    buyerName: 'Farhan Sadik',
    buyerEmail: 'farhan.pcbuild@gmail.com',
    buyerPhone: '+880 1521-443920',
    productId: 'prod-win11-pro',
    productName: 'Windows 11 Pro',
    variantId: 'var-win11-retail-life',
    variantName: 'Lifetime Retail Key',
    credentialType: 'license_key',
    deliveryMode: 'auto_vault',
    status: 'delivered',
    credentialPayload: {
      secretValue: 'W269N-WFGWX-YVC9B-4J6C9-T83GX'
    },
    vpnRequired: false,
    vpnRegionNote: 'Global online activation.',
    hasWarranty: true,
    warrantyDays: 365,
    warrantyRemainingDays: 360,
    warrantyTerms: 'Lifetime activation on 1 PC.',
    replacementHistoryCount: 0,
    loginInstructions: [
      'Open Settings > Activation.',
      'Enter the 25-character Retail Key.'
    ],
    customAdminNote: '[notice]Retail key permanently bound to 1 PC.[/notice]'
  }
];

export const INITIAL_SUBSCRIBERS: SubscriberUser[] = [
  {
    id: 'usr-101',
    name: 'Mehedi Hasan',
    email: 'shuvo.fullstack@gmail.com',
    phone: '+880 1911-548291',
    joinedAt: '2026-03-14',
    status: 'active',
    role: 'vip',
    totalSpentBDT: 14850,
    ordersCount: 14,
    warrantyClaimsCount: 1,
    activeSubscriptions: [
      {
        id: 'sub-901',
        productName: 'Cursor Pro',
        variantName: '1M Private Account',
        credentialType: 'email_login',
        startedAt: '2026-10-29',
        expiresAt: '2026-11-28',
        remainingDays: 29,
        autoRenew: true,
        warrantyActive: true
      },
      {
        id: 'sub-902',
        productName: 'ChatGPT Plus',
        variantName: '1M Private Invite',
        credentialType: 'invite_link',
        startedAt: '2026-10-15',
        expiresAt: '2026-11-14',
        remainingDays: 15,
        autoRenew: true,
        warrantyActive: true
      }
    ]
  },
  {
    id: 'usr-102',
    name: 'Nusrat Jahan',
    email: 'nusrat.ux@outlook.com',
    phone: '+880 1819-330192',
    joinedAt: '2026-06-02',
    status: 'active',
    role: 'subscriber',
    totalSpentBDT: 4200,
    ordersCount: 6,
    warrantyClaimsCount: 1,
    activeSubscriptions: [
      {
        id: 'sub-903',
        productName: 'ChatGPT Plus',
        variantName: '1M Access Token',
        credentialType: 'token',
        startedAt: '2026-10-24',
        expiresAt: '2026-11-23',
        remainingDays: 24,
        autoRenew: false,
        warrantyActive: true
      }
    ]
  },
  {
    id: 'usr-103',
    name: 'Tanvir Ahmed',
    email: 'tanvir.ahmed@gmail.com',
    phone: '+880 1755-129834',
    joinedAt: '2026-01-19',
    status: 'active',
    role: 'reseller',
    totalSpentBDT: 38900,
    ordersCount: 42,
    warrantyClaimsCount: 3,
    activeSubscriptions: [
      {
        id: 'sub-904',
        productName: 'NordVPN Complete',
        variantName: '1Y Shared Login',
        credentialType: 'email_login',
        startedAt: '2026-10-20',
        expiresAt: '2027-10-20',
        remainingDays: 355,
        autoRenew: true,
        warrantyActive: true
      },
      {
        id: 'sub-905',
        productName: 'Netflix 4K UHD',
        variantName: '6M PIN Profile',
        credentialType: 'email_login',
        startedAt: '2026-08-10',
        expiresAt: '2027-02-06',
        remainingDays: 99,
        autoRenew: false,
        warrantyActive: true
      }
    ]
  },
  {
    id: 'usr-104',
    name: 'Rafiqul Islam',
    email: 'rafiq.dev@gmail.com',
    phone: '+880 1712-884920',
    joinedAt: '2026-09-10',
    status: 'active',
    role: 'subscriber',
    totalSpentBDT: 2630,
    ordersCount: 3,
    warrantyClaimsCount: 0,
    activeSubscriptions: [
      {
        id: 'sub-906',
        productName: 'ChatGPT Plus',
        variantName: '1M Private Invite',
        credentialType: 'invite_link',
        startedAt: '2026-10-30',
        expiresAt: '2026-11-29',
        remainingDays: 30,
        autoRenew: true,
        warrantyActive: true
      }
    ]
  },
  {
    id: 'usr-105',
    name: 'Arifur Rahman',
    email: 'arif.agency@gmail.com',
    phone: '+880 1312-908112',
    joinedAt: '2026-05-22',
    status: 'past_due',
    role: 'subscriber',
    totalSpentBDT: 1900,
    ordersCount: 3,
    warrantyClaimsCount: 0,
    activeSubscriptions: [
      {
        id: 'sub-907',
        productName: 'Netflix 4K UHD',
        variantName: '1M PIN Profile',
        credentialType: 'email_login',
        startedAt: '2026-09-28',
        expiresAt: '2026-10-28',
        remainingDays: 0,
        autoRenew: true,
        warrantyActive: false
      }
    ]
  }
];

export const INITIAL_PAYMENTS: PaymentTransaction[] = [
  {
    id: 'PAY-5501',
    orderId: 'ORD-88219',
    buyerName: 'Rafiqul Islam',
    buyerEmail: 'rafiq.dev@gmail.com',
    productSummary: 'ChatGPT Plus · 1M Invite',
    amountBDT: 1250,
    gateway: 'bKash',
    senderNumberOrRef: '01712-884920',
    trxId: 'BKX99482KL',
    status: 'verified',
    createdAt: '2026-10-30 01:40'
  },
  {
    id: 'PAY-5502',
    orderId: 'ORD-88220',
    buyerName: 'Kamrul Hasan',
    buyerEmail: 'kamrul.graphics@gmail.com',
    productSummary: 'Cursor Pro · 1M Token',
    amountBDT: 550,
    gateway: 'Nagad',
    senderNumberOrRef: '01844-119203',
    trxId: 'NGD748291P',
    status: 'pending_verification',
    createdAt: '2026-10-30 02:08'
  },
  {
    id: 'PAY-5503',
    orderId: 'ORD-88215',
    buyerName: 'Nusrat Jahan',
    buyerEmail: 'nusrat.ux@outlook.com',
    productSummary: 'ChatGPT Plus · 1M Token',
    amountBDT: 450,
    gateway: 'bKash',
    senderNumberOrRef: '01819-330192',
    trxId: 'BKX88310MN',
    status: 'verified',
    createdAt: '2026-10-29 22:17'
  },
  {
    id: 'PAY-5504',
    orderId: 'ORD-88212',
    buyerName: 'Mehedi Hasan',
    buyerEmail: 'shuvo.fullstack@gmail.com',
    productSummary: 'Cursor Pro · 1M Private',
    amountBDT: 950,
    gateway: 'Binance Pay',
    senderNumberOrRef: 'UID: 482910442',
    trxId: 'BNB992841002',
    status: 'verified',
    createdAt: '2026-10-29 19:04'
  },
  {
    id: 'PAY-5505',
    orderId: 'ORD-88208',
    buyerName: 'Sabbir Rahman',
    buyerEmail: 'sabbir.cine@gmail.com',
    productSummary: 'Netflix 4K · 1M PIN',
    amountBDT: 380,
    gateway: 'bKash',
    senderNumberOrRef: '01675-992014',
    trxId: 'BKX77291QR',
    status: 'verified',
    createdAt: '2026-10-28 16:29'
  },
  {
    id: 'PAY-5506',
    orderId: 'ORD-88221',
    buyerName: 'Zahidul Karim',
    buyerEmail: 'zahid.bd@gmail.com',
    productSummary: 'Netflix 4K · 6M PIN',
    amountBDT: 2100,
    gateway: 'bKash',
    senderNumberOrRef: '01922-773819',
    trxId: 'BKX10293ZZ',
    status: 'pending_verification',
    createdAt: '2026-10-30 02:19'
  }
];

export const INITIAL_COUPONS: CouponCode[] = [
  {
    id: 'cpn-1',
    code: 'BITLOGIC15',
    discountType: 'percentage',
    discountValue: 15,
    minSpendBDT: 500,
    usedCount: 84,
    maxUses: 200,
    expiresAt: '2026-12-31',
    status: 'active'
  },
  {
    id: 'cpn-2',
    code: 'DEVPRO100',
    discountType: 'fixed_bdt',
    discountValue: 100,
    minSpendBDT: 800,
    usedCount: 49,
    maxUses: 100,
    expiresAt: '2026-11-30',
    status: 'active'
  },
  {
    id: 'cpn-3',
    code: 'RENEW10',
    discountType: 'percentage',
    discountValue: 10,
    minSpendBDT: 350,
    usedCount: 132,
    maxUses: 500,
    expiresAt: '2027-03-31',
    status: 'active'
  }
];

export const INITIAL_FEATURE_FLAGS: SystemFeatureFlag[] = [
  {
    id: 'ff-auto-vault',
    category: 'Fulfillment Engine',
    name: 'Auto-Vault Dispatch',
    key: 'engine.auto_vault',
    description: 'Deliver pre-stocked tokens, keys, and logins automatically when payment is verified.',
    enabled: true,
    impactNote: 'Instant delivery'
  },
  {
    id: 'ff-stock-counter',
    category: 'Storefront & Stock UX',
    name: 'Live Stock Counter',
    key: 'storefront.stock_count',
    description: 'Show available Vault stock per product option on the product page.',
    enabled: true,
    impactNote: 'Prevents overselling'
  },
  {
    id: 'ff-vpn-notice',
    category: 'Storefront & Stock UX',
    name: 'VPN & Device Badge',
    key: 'storefront.vpn_badge',
    description: 'Show VPN requirement and device limit before checkout.',
    enabled: true,
    impactNote: 'Reduces login issues'
  },
  {
    id: 'ff-warranty-replacement',
    category: 'Warranty & Security',
    name: 'Warranty Claim Portal',
    key: 'warranty.claim_portal',
    description: 'Allow buyers with active warranty to request credential replacement.',
    enabled: true,
    impactNote: '1-click Vault swap'
  },
  {
    id: 'ff-otp-helper',
    category: 'Warranty & Security',
    name: '2FA OTP Bridge',
    key: 'security.otp_bridge',
    description: 'Allow shared-account buyers to fetch login codes using their Order ID.',
    enabled: true,
    impactNote: 'Self-service OTP'
  },
  {
    id: 'ff-manual-trx-guard',
    category: 'Payment & Webhooks',
    name: 'Duplicate TrxID Guard',
    key: 'payment.trxid_guard',
    description: 'Block duplicate bKash and Nagad Transaction IDs automatically.',
    enabled: true,
    impactNote: 'Fraud protection'
  },
  {
    id: 'ff-expiry-reminder',
    category: 'Fulfillment Engine',
    name: 'Expiry Reminder',
    key: 'engine.expiry_notice',
    description: 'Send renewal reminders 72 hours before a plan expires.',
    enabled: true,
    impactNote: 'Auto-renewal prompt'
  },
  {
    id: 'ff-maintenance-mode',
    category: 'Storefront & Stock UX',
    name: 'Manual Queue Notice',
    key: 'storefront.queue_banner',
    description: 'Show estimated delivery window for manual-invite workspaces.',
    enabled: false,
    impactNote: 'Inactive'
  }
];

export const REVENUE_CHART_DATA = [
  { month: 'May', revenueBDT: 485000, orders: 640, autoDelivered: 590 },
  { month: 'Jun', revenueBDT: 562000, orders: 745, autoDelivered: 702 },
  { month: 'Jul', revenueBDT: 694000, orders: 910, autoDelivered: 865 },
  { month: 'Aug', revenueBDT: 812000, orders: 1060, autoDelivered: 1012 },
  { month: 'Sep', revenueBDT: 945000, orders: 1230, autoDelivered: 1185 },
  { month: 'Oct', revenueBDT: 1275800, orders: 1640, autoDelivered: 1588 }
];

export const INITIAL_ADMIN_TICKETS: AdminSupportTicket[] = [
  {
    id: 'TKT-4092',
    subject: 'ChatGPT Plus Workspace invite activation email',
    orderId: 'ORD-88219',
    deliveryId: 'DLV-9048',
    buyerName: 'Rafiqul Islam',
    buyerEmail: 'rafiq.dev@gmail.com',
    buyerPhone: '+880 1712-884920',
    productName: 'ChatGPT Plus · 1M Private Invite',
    category: 'Access & Delivery',
    priority: 'High',
    status: 'open',
    updatedAt: '10:22 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'atkt-1',
        sender: 'customer',
        senderName: 'Rafiqul Islam',
        text: 'Please send the OpenAI Team Workspace invitation to rafiq.dev@gmail.com for order ORD-88219.',
        time: '10:16 AM'
      },
      {
        id: 'atkt-2',
        sender: 'admin',
        senderName: 'Support Admin',
        text: 'Queued for rafiq.dev@gmail.com. We are dispatching the workspace seat right now.',
        time: '10:19 AM'
      },
      {
        id: 'atkt-3',
        sender: 'customer',
        senderName: 'Rafiqul Islam',
        text: 'Should I check the Spam/Promotions tab as well?',
        time: '10:22 AM'
      }
    ]
  },
  {
    id: 'TKT-4088',
    subject: 'Token session expired (401) replacement request',
    orderId: 'ORD-88215',
    deliveryId: 'DLV-9047',
    buyerName: 'Nusrat Jahan',
    buyerEmail: 'nusrat.ux@outlook.com',
    buyerPhone: '+880 1819-330192',
    productName: 'ChatGPT Plus · 1M Access Token',
    category: 'Warranty / Replacement',
    priority: 'Urgent',
    status: 'open',
    updatedAt: '09:46 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'atkt-4',
        sender: 'customer',
        senderName: 'Nusrat Jahan',
        text: 'Hi team, my token for ORD-88215 got revoked with a 401 error. I have 24 days warranty left—please issue a replacement token.',
        time: '09:46 AM'
      }
    ]
  },
  {
    id: 'TKT-4051',
    subject: 'Netflix 4K Smart TV household verification code',
    orderId: 'ORD-88208',
    deliveryId: 'DLV-9045',
    buyerName: 'Sabbir Rahman',
    buyerEmail: 'sabbir.cine@gmail.com',
    buyerPhone: '+880 1675-992014',
    productName: 'Netflix 4K UHD · 1M PIN Profile',
    category: 'Login / Credentials',
    priority: 'Normal',
    status: 'answered',
    updatedAt: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'atkt-5',
        sender: 'customer',
        senderName: 'Sabbir Rahman',
        text: 'Need the 4-digit household verification code to sign in on my LG Smart TV.',
        time: 'Yesterday'
      },
      {
        id: 'atkt-6',
        sender: 'admin',
        senderName: 'Support Admin',
        text: 'Verification code: 7741 (valid for 15 minutes). Use Slot-2 with PIN 3914.',
        time: 'Yesterday'
      }
    ]
  },
  {
    id: 'TKT-3994',
    subject: 'NordVPN WARP initial login setup question',
    orderId: 'ORD-88204',
    deliveryId: 'DLV-9044',
    buyerName: 'Tanvir Ahmed',
    buyerEmail: 'tanvir.ahmed@gmail.com',
    buyerPhone: '+880 1755-129834',
    productName: 'NordVPN Complete · 1Y Shared Login',
    category: 'General',
    priority: 'Normal',
    status: 'closed',
    updatedAt: 'Oct 25',
    unreadCount: 0,
    messages: [
      {
        id: 'atkt-7',
        sender: 'customer',
        senderName: 'Tanvir Ahmed',
        text: 'After logging in with WARP 1.1.1.1, can I turn off WARP and use NordLynx directly?',
        time: 'Oct 25'
      },
      {
        id: 'atkt-8',
        sender: 'admin',
        senderName: 'Support Admin',
        text: 'Yes! WARP is only needed once for the OAuth browser sign-in. After that, disconnect WARP and use NordVPN directly.',
        time: 'Oct 25'
      }
    ]
  }
];

export const INITIAL_ADMIN_NOTIFICATIONS: AdminNotificationItem[] = [
  {
    id: 'anotif-1',
    type: 'order_chat',
    orderId: 'ORD-88219',
    deliveryId: 'DLV-9048',
    title: 'Rafiqul Islam',
    message: 'Please let me know here once the invitation email is sent.',
    time: '10:22 AM',
    read: false
  },
  {
    id: 'anotif-2',
    type: 'ticket',
    ticketId: 'TKT-4088',
    orderId: 'ORD-88215',
    title: 'Token session expired (401)',
    message: 'Nusrat Jahan requested a replacement token for ORD-88215.',
    time: '09:46 AM',
    read: false
  },
  {
    id: 'anotif-3',
    type: 'order_chat',
    orderId: 'ORD-88215',
    deliveryId: 'DLV-9047',
    title: 'Nusrat Jahan',
    message: 'My access token started showing 401 session expired this morning.',
    time: '09:45 AM',
    read: false
  },
  {
    id: 'anotif-4',
    type: 'ticket',
    ticketId: 'TKT-4092',
    orderId: 'ORD-88219',
    title: 'ChatGPT Plus Workspace invite',
    message: 'Rafiqul Islam: Should I check the Spam/Promotions tab as well?',
    time: '10:22 AM',
    read: true
  },
  {
    id: 'anotif-5',
    type: 'payment',
    orderId: 'ORD-88220',
    title: 'Payment Verification',
    message: 'Kamrul Hasan submitted Nagad TrxID NGD748291P (৳550).',
    time: '02:08 AM',
    read: true
  },
  {
    id: 'anotif-6',
    type: 'warranty',
    orderId: 'ORD-88215',
    deliveryId: 'DLV-9047',
    title: 'Warranty Claim Opened',
    message: 'Claim filed on ChatGPT Plus · 1M Access Token.',
    time: 'Yesterday',
    read: true
  },
  {
    id: 'anotif-7',
    type: 'order_chat',
    orderId: 'ORD-88212',
    deliveryId: 'DLV-9046',
    title: 'Mehedi Hasan',
    message: 'Logged in smoothly, Claude 3.5 Sonnet fast requests are working.',
    time: 'Yesterday',
    read: true
  }
];
