/**
 * Payment gateways the admin can record. Colors follow each brand so a row
 * is recognisable at a glance; `fg` is darkened where the brand color is too
 * light to read on its own tint.
 */
export type GatewayStyle = {
  name: string;
  /** Two-letter mark shown in the badge tile. */
  mark: string;
  fg: string;
  bg: string;
  tile: string;
  tileFg: string;
};

export const GATEWAYS: GatewayStyle[] = [
  { name: 'bKash', mark: 'bK', fg: '#B8105A', bg: '#FDEAF2', tile: '#E2136E', tileFg: '#fff' },
  { name: 'Nagad', mark: 'Ng', fg: '#B5410F', bg: '#FEF0E6', tile: '#EC5B24', tileFg: '#fff' },
  { name: 'Rocket', mark: 'Rk', fg: '#6E2A7A', bg: '#F5ECF7', tile: '#8C3494', tileFg: '#fff' },
  { name: 'Upay', mark: 'Up', fg: '#7A5B00', bg: '#FFF8D6', tile: '#FFD200', tileFg: '#1F2937' },
  { name: 'Tap', mark: 'Tp', fg: '#7C1D2E', bg: '#FBEAED', tile: '#9E2A3F', tileFg: '#fff' },
  { name: 'SureCash', mark: 'Sc', fg: '#0F5E8C', bg: '#E7F2FA', tile: '#1478B4', tileFg: '#fff' },
  { name: 'Binance Pay', mark: 'BN', fg: '#7A5A00', bg: '#FEF6DB', tile: '#F0B90B', tileFg: '#1E2026' },
  { name: 'USDT', mark: '₮', fg: '#17775F', bg: '#E5F5F0', tile: '#26A17B', tileFg: '#fff' },
  { name: 'Stripe', mark: 'St', fg: '#4B43C9', bg: '#EEEDFF', tile: '#635BFF', tileFg: '#fff' },
  { name: 'PayPal', mark: 'PP', fg: '#003087', bg: '#E8EEF8', tile: '#003087', tileFg: '#fff' },
  { name: 'Card', mark: 'Cd', fg: '#1E3A8A', bg: '#EAF0FB', tile: '#1D4ED8', tileFg: '#fff' },
  { name: 'Bank Transfer', mark: 'Bk', fg: '#334155', bg: '#EEF2F6', tile: '#475569', tileFg: '#fff' },
  { name: 'Cash', mark: '৳', fg: '#166534', bg: '#E9F7EE', tile: '#16A34A', tileFg: '#fff' },
  { name: 'Other', mark: '··', fg: '#475569', bg: '#F1F5F9', tile: '#94A3B8', tileFg: '#fff' },
];

const BY_KEY = new Map(GATEWAYS.map((g) => [g.name.toLowerCase(), g]));

export function gatewayStyle(name: string | null | undefined): GatewayStyle {
  const key = (name || '').trim().toLowerCase();
  return (
    BY_KEY.get(key) ||
    (key.includes('bkash') && BY_KEY.get('bkash')) ||
    (key.includes('nagad') && BY_KEY.get('nagad')) ||
    (key.includes('binance') && BY_KEY.get('binance pay')) ||
    (key.includes('bank') && BY_KEY.get('bank transfer')) ||
    { ...BY_KEY.get('other')!, name: name?.trim() || 'Other' }
  );
}

export const GATEWAY_NAMES = GATEWAYS.map((g) => g.name);
