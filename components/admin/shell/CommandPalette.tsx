'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CornerDownLeft,
  CreditCard,
  Database,
  FileText,
  Headset,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Mail,
  Network,
  PanelTop,
  Search,
  Send,
  Sliders,
  Ticket,
  UserCog,
  Users,
} from 'lucide-react';
import type {
  AdminSupportTicket,
  AdminTab,
  DigitalDelivery,
  DigitalProduct,
  PaymentTransaction,
  SubscriberUser,
  VaultCredential,
} from '@/lib/admin/types';

type Result = {
  id: string;
  group: string;
  title: string;
  meta?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  pages: Array<{ id: AdminTab; label: string; keywords?: string }>;
  deliveries: DigitalDelivery[];
  subscribers: SubscriberUser[];
  products: DigitalProduct[];
  payments: PaymentTransaction[];
  tickets: AdminSupportTicket[];
  vault: VaultCredential[];
  goTab: (tab: AdminTab) => void;
  openOrder: (deliveryId: string) => void;
  openCustomer: (id: string) => void;
  openProduct: (id: string) => void;
  openTicket: (id: string) => void;
  openCredential: (id: string) => void;
};

const PER_GROUP = 5;

const PAGE_ICON: Partial<Record<AdminTab, React.ComponentType<{ className?: string }>>> = {
  overview: LayoutDashboard,
  products: Layers,
  'product-add': Layers,
  warranties: Layers,
  'credential-types': Layers,
  categories: Layers,
  vault: Database,
  'vault-manual': Database,
  'vault-bulk': Database,
  deliveries: Send,
  'order-add': Send,
  'orders-renewals': Send,
  'orders-pinned': Send,
  'warranty-claims': Send,
  payments: CreditCard,
  coupons: CreditCard,
  tickets: Ticket,
  users: Users,
  'user-add': Users,
  suppliers: Network,
  'supplier-catalog': Network,
  'supplier-links': Network,
  'supplier-orders': Network,
  'supplier-settings': Network,
  media: ImageIcon,
  features: Sliders,
  storefront: PanelTop,
  email: Mail,
  'email-templates': Mail,
  'email-triggers': Mail,
  contact: Headset,
  staff: UserCog,
  'staff-add': UserCog,
};

function has(q: string, ...fields: Array<string | undefined | null>) {
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onClose } = props;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Result[] = [];
    const push = (list: Result[]) => out.push(...list.slice(0, q ? PER_GROUP : list.length));

    push(
      props.pages
        .filter((p) => !q || `${p.label} ${p.keywords || ''}`.toLowerCase().includes(q))
        .map((p) => ({
          id: `page-${p.id}`,
          group: 'Go to',
          title: p.label,
          icon: PAGE_ICON[p.id] || FileText,
          run: () => props.goTab(p.id),
        })),
    );
    if (!q) return out;

    // Orders: one result per order, matched on id, buyer, product or TrxID.
    const seen = new Set<string>();
    const orderHits: Result[] = [];
    for (const d of props.deliveries) {
      if (seen.has(d.orderId)) continue;
      if (!has(q, d.orderId, d.id, d.buyerName, d.buyerEmail, d.buyerPhone, d.productName)) continue;
      seen.add(d.orderId);
      const units = props.deliveries.filter((x) => x.orderId === d.orderId);
      orderHits.push({
        id: `ord-${d.orderId}`,
        group: 'Orders',
        title: d.orderId,
        meta: `${d.buyerName} · ${units.length > 1 ? `${units.length} items` : d.productName}`,
        icon: Send,
        run: () => props.openOrder(units.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0].id),
      });
    }
    push(orderHits);

    push(
      props.subscribers
        .filter((s) => has(q, s.name, s.email, s.phone))
        .map((s) => ({
          id: `cus-${s.id}`,
          group: 'Customers',
          title: s.name,
          meta: s.email,
          icon: Users,
          run: () => props.openCustomer(s.id),
        })),
    );

    push(
      props.products
        .filter((p) => has(q, p.name, p.sku, p.category, ...p.variants.map((v) => v.name)))
        .map((p) => ({
          id: `prd-${p.id}`,
          group: 'Products',
          title: p.name,
          meta: `${p.variants.length} plan${p.variants.length === 1 ? '' : 's'} · ${p.category}`,
          icon: Layers,
          run: () => props.openProduct(p.id),
        })),
    );

    push(
      props.payments
        .filter((p) => has(q, p.trxId, p.senderNumberOrRef))
        .map((p) => ({
          id: `pay-${p.id}`,
          group: 'Payments',
          title: p.trxId,
          meta: `${p.gateway} · ${p.orderId} · ${p.buyerName}`,
          icon: CreditCard,
          run: () => {
            const d = props.deliveries.find((x) => x.orderId === p.orderId);
            if (d) props.openOrder(d.id);
            else props.goTab('payments');
          },
        })),
    );

    push(
      props.tickets
        .filter((t) => has(q, t.id, t.subject, t.buyerName, t.buyerEmail, t.orderId))
        .map((t) => ({
          id: `tck-${t.id}`,
          group: 'Tickets',
          title: t.subject,
          meta: `${t.id} · ${t.buyerName}`,
          icon: Ticket,
          run: () => props.openTicket(t.id),
        })),
    );

    push(
      props.vault
        .filter((v) => has(q, v.id, v.email, v.assignedOrderId))
        .map((v) => ({
          id: `vlt-${v.id}`,
          group: 'Credentials',
          title: v.email || v.id,
          meta: `${v.productName} · ${v.variantName} · ${v.status}`,
          icon: Database,
          run: () => props.openCredential(v.id),
        })),
    );

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, props.pages, props.deliveries, props.subscribers, props.products, props.payments, props.tickets, props.vault]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const choose = (r: Result | undefined) => {
    if (!r) return;
    r.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 px-3 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, customers, products, TrxID…"
            aria-label="Search everything"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
            className="h-14 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-slate-400"
            style={{ fontSize: '1rem' }}
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-500 sm:inline dark:border-slate-700">
            Esc
          </kbd>
        </div>

        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-slate-500">
              No results for “{query}”
            </p>
          ) : (
            results.map((r, i) => {
              const header = r.group !== lastGroup ? r.group : null;
              lastGroup = r.group;
              const Icon = r.icon;
              const selected = i === active;
              return (
                <React.Fragment key={r.id}>
                  {header ? (
                    <div className="px-3 pb-1 pt-3 text-xs font-semibold text-slate-500 first:pt-1">
                      {header}
                    </div>
                  ) : null}
                  <div
                    id={`cmdk-${r.id}`}
                    data-idx={i}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(r)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${
                      selected ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</div>
                      {r.meta ? <div className="truncate text-xs text-slate-500">{r.meta}</div> : null}
                    </div>
                    {selected ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /> : null}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
