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
    const activeUser = subscribers.find((u) => u.id === selectedCustomerId);

    if (!activeUser) {
      if (!subscribers.length) {
        return (
          <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading customer details">
            <div className="h-8 w-48 rounded bg-slate-200/80 dark:bg-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-28 rounded-lg bg-slate-200/60 dark:bg-slate-800" />
              <div className="h-28 rounded-lg bg-slate-200/60 dark:bg-slate-800" />
              <div className="h-28 rounded-lg bg-slate-200/60 dark:bg-slate-800" />
            </div>
            <div className="h-64 rounded-lg bg-slate-200/50 dark:bg-slate-800" />
          </div>
        );
      }
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">This customer was not found.</p>
          <button
            type="button"
            onClick={onBackToList}
            className="mt-4 h-9 rounded-md border border-slate-200 px-4 text-sm font-medium dark:border-slate-700 cursor-pointer"
          >
            Back to customers
          </button>
        </div>
      );
    }

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
