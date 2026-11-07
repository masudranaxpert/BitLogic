'use client';

import { ArrowUpRight, Package, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/products';
import {
  OrderRowCard,
  StoreButton,
  StoreStatCard,
  StoreSurfaceCard,
  type CustomerOrderItem,
} from '@/components/storefront/ui';

type Props = {
  orders: CustomerOrderItem[];
  activeOrdersCount: number;
  pendingOrdersCount: number;
  unreadChatOrdersCount: number;
  totalSpent: number;
  onNewTicket: () => void;
  onOpenOrders: () => void;
  onOpenAccess: (orderId: string) => void;
};

export function AccountOverviewPanel({
  orders,
  activeOrdersCount,
  pendingOrdersCount,
  unreadChatOrdersCount,
  totalSpent,
  onNewTicket,
  onOpenOrders,
  onOpenAccess,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900 m-0">Overview</h1>

        <div className="flex items-center gap-2">
          <StoreButton variant="outline" size="sm" onClick={onNewTicket}>
            <Plus size={13} />
            <span>New Ticket</span>
          </StoreButton>
          <StoreButton variant="dark" size="sm" onClick={onOpenOrders}>
            <Package size={13} />
            <span>Orders</span>
          </StoreButton>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StoreStatCard
          label="Active Access"
          value={activeOrdersCount}
          badge="Active"
          tone="emerald"
        />
        <StoreStatCard
          label="Pending (10–24h)"
          value={pendingOrdersCount}
          badge="Queue"
          tone="amber"
        />
        <StoreStatCard
          label="Unread Messages"
          value={unreadChatOrdersCount}
          badge={unreadChatOrdersCount > 0 ? 'New Chat' : 'All Read'}
          tone={unreadChatOrdersCount > 0 ? 'coral' : 'slate'}
        />
        <StoreStatCard
          label="Total Spent"
          value={formatPrice(totalSpent)}
          badge={`${orders.length} Orders`}
          tone="slate"
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 m-0">Recent Orders</h2>
          <StoreButton variant="outline" size="sm" onClick={onOpenOrders}>
            <span>View all ({orders.length})</span>
            <ArrowUpRight size={13} />
          </StoreButton>
        </div>

        <StoreSurfaceCard
          padded={false}
          className="divide-y divide-slate-200 overflow-hidden"
        >
          {orders.slice(0, 5).map((order) => (
            <OrderRowCard
              key={order.id}
              order={order}
              onOpenAccess={onOpenAccess}
            />
          ))}
        </StoreSurfaceCard>
      </div>
    </div>
  );
}
