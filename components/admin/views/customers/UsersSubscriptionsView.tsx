'use client';

import React, { useState } from 'react';
import {
  SubscriberUser,
  DigitalProduct,
  DigitalDelivery,
  PaymentTransaction,
} from '@/lib/admin-data';
import { AddCustomerForm } from './AddCustomerForm';
import { CustomerDetail } from './CustomerDetail';
import { CustomersList } from './CustomersList';

interface UsersSubscriptionsViewProps {
  mode: 'list' | 'detail' | 'add';
  subscribers: SubscriberUser[];
  products: DigitalProduct[];
  deliveries: DigitalDelivery[];
  payments: PaymentTransaction[];
  selectedCustomerId: string | null;
  onSelectCustomer: (userId: string) => void;
  onOpenAddCustomer: () => void;
  onBackToList: () => void;
  onAddCustomer: (newCustomer: SubscriberUser) => void;
  onRenewSubscription: (
    userId: string,
    subId: string,
    amountBDT?: number,
    paymentMeta?: {
      gateway: PaymentTransaction['gateway'];
      trxId: string;
      senderNumberOrRef?: string;
    },
  ) => void;
  onAssignSubscription: (
    userId: string,
    productId: string,
    variantId: string,
    amountBDT?: number,
    quantity?: number,
  ) => void;
  onToggleUserStatus: (userId: string) => void;
  onUpdateCustomer: (
    userId: string,
    patch: Partial<
      Pick<
        SubscriberUser,
        'name' | 'email' | 'phone' | 'joinedAt' | 'role' | 'status'
      >
    >,
  ) => void;
}

export default function UsersSubscriptionsView({
  mode,
  subscribers,
  products,
  deliveries,
  payments,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddCustomer,
  onBackToList,
  onAddCustomer,
  onRenewSubscription,
  onAssignSubscription,
  onToggleUserStatus,
  onUpdateCustomer,
}: UsersSubscriptionsViewProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'reseller'>('all');
  const [showStatistics, setShowStatistics] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const filteredUsers = subscribers.filter((u) => {
    const matchesTab =
      filter === 'all'
        ? true
        : filter === 'reseller'
        ? u.role === 'reseller' || u.role === 'vip'
        : u.status === filter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalLifetimeSpend = subscribers.reduce((s, u) => s + u.totalSpentBDT, 0);
  const totalActivePlans = subscribers.reduce(
    (s, u) => s + u.activeSubscriptions.filter((sub) => sub.remainingDays > 0).length,
    0
  );

  if (mode === 'add') {
    return (
      <AddCustomerForm
        products={products}
        onBackToList={onBackToList}
        onAddCustomer={onAddCustomer}
      />
    );
  }

  if (mode === 'detail') {
    const activeUser =
      subscribers.find((u) => u.id === selectedCustomerId) || subscribers[0];

    if (!activeUser) return null;

    return (
      <CustomerDetail
        activeUser={activeUser}
        products={products}
        deliveries={deliveries}
        payments={payments}
        onBackToList={onBackToList}
        onRenewSubscription={onRenewSubscription}
        onAssignSubscription={onAssignSubscription}
        onToggleUserStatus={onToggleUserStatus}
        onUpdateCustomer={onUpdateCustomer}
      />
    );
  }

  return (
    <CustomersList
      subscribers={subscribers}
      filteredUsers={filteredUsers}
      filter={filter}
      search={search}
      showStatistics={showStatistics}
      selectedUserIds={selectedUserIds}
      totalLifetimeSpend={totalLifetimeSpend}
      totalActivePlans={totalActivePlans}
      onFilterChange={setFilter}
      onSearchChange={setSearch}
      onShowStatisticsChange={setShowStatistics}
      onSelectedUserIdsChange={setSelectedUserIds}
      onSelectCustomer={onSelectCustomer}
      onOpenAddCustomer={onOpenAddCustomer}
      onResetFilters={() => {
        setFilter('all');
        setSearch('');
      }}
    />
  );
}
