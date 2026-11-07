'use client';

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { SubscriberUser } from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  formatBDT,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  ShadcnCheckbox,
  PaginationFooter,
  EmptyTableState,
} from '@/components/admin/ui/primitives';
import { EmailVerifiedBadge } from './EmailVerifiedBadge';

type CustomerFilter = 'all' | 'active' | 'suspended' | 'reseller';

interface CustomersListProps {
  subscribers: SubscriberUser[];
  filteredUsers: SubscriberUser[];
  filter: CustomerFilter;
  search: string;
  showStatistics: boolean;
  selectedUserIds: string[];
  totalLifetimeSpend: number;
  totalActivePlans: number;
  onFilterChange: (value: CustomerFilter) => void;
  onSearchChange: (value: string) => void;
  onShowStatisticsChange: (value: boolean) => void;
  onSelectedUserIdsChange: (ids: string[] | ((prev: string[]) => string[])) => void;
  onSelectCustomer: (userId: string) => void;
  onOpenAddCustomer: () => void;
  onResetFilters: () => void;
}

export function CustomersList({
  subscribers,
  filteredUsers,
  filter,
  search,
  showStatistics,
  selectedUserIds,
  totalLifetimeSpend,
  totalActivePlans,
  onFilterChange,
  onSearchChange,
  onShowStatisticsChange,
  onSelectedUserIdsChange,
  onSelectCustomer,
  onOpenAddCustomer,
  onResetFilters,
}: CustomersListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => setPage(1), [filteredUsers.length]);
  const paged = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Customer
        </h1>

        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedTabs
            options={[
              { value: 'all', label: 'All', count: subscribers.length },
              {
                value: 'active',
                label: 'Active',
                count: subscribers.filter((s) => s.status === 'active').length,
              },
              {
                value: 'suspended',
                label: 'Suspended',
                count: subscribers.filter((s) => s.status === 'suspended').length,
              },
              {
                value: 'reseller',
                label: 'Resellers',
                count: subscribers.filter((s) => s.role !== 'subscriber').length,
              },
            ]}
            value={filter}
            onChange={onFilterChange}
          />
          <SwitchToggle
            checked={showStatistics}
            onChange={onShowStatisticsChange}
            label="Stats"
          />
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search customer, email, or phone..."
          className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 w-full md:w-64 shadow-2xs"
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Customers" value={String(subscribers.length)} />
          <StatMetric label="Active Plans" value={String(totalActivePlans)} />
          <StatMetric label="Lifetime Revenue" value={formatBDT(totalLifetimeSpend)} />
          <StatMetric
            label="Resellers"
            value={String(subscribers.filter((s) => s.role !== 'subscriber').length)}
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        {subscribers.length === 0 ? (
          <EmptyTableState title="No customers" />
        ) : filteredUsers.length === 0 ? (
          <EmptyTableState
            title="No matches"
            onReset={onResetFilters}
            resetLabel="Clear filters"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 w-9">
                    <ShadcnCheckbox
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUserIds.length === filteredUsers.length
                      }
                      onChange={(c) =>
                        onSelectedUserIdsChange(c ? filteredUsers.map((u) => u.id) : [])
                      }
                    />
                  </th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Tier</th>
                  <th className="py-3 px-3">Plans</th>
                  <th className="py-3 px-3">Total Spent</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {paged.map((user) => {
                  const checked = selectedUserIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      onClick={() => onSelectCustomer(user.id)}
                      className={`transition-colors whitespace-nowrap cursor-pointer ${
                        checked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <ShadcnCheckbox
                          checked={checked}
                          onChange={() =>
                            onSelectedUserIdsChange((prev) =>
                              prev.includes(user.id)
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id]
                            )
                          }
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-display font-bold text-[11px] flex items-center justify-center shrink-0">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {user.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className={`truncate font-mono text-xs ${
                                user.emailVerified === true
                                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {user.email}
                            </span>
                            {user.emailVerified === true ? (
                              <EmailVerifiedBadge verified compact />
                            ) : null}
                          </div>
                          {user.emailVerified !== true ? (
                            <EmailVerifiedBadge verified={user.emailVerified} />
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {user.phone?.trim() ? user.phone : '—'}
                      </td>

                      <td className="py-3 px-3">
                        <StatusIndicator
                          tone={
                            user.role === 'reseller'
                              ? 'purple'
                              : user.role === 'vip'
                              ? 'blue'
                              : 'zinc'
                          }
                          label={
                            user.role === 'reseller'
                              ? 'Reseller'
                              : user.role === 'vip'
                              ? 'VIP'
                              : 'Subscriber'
                          }
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {user.activeSubscriptions.length} active
                      </td>

                      <td className="admin-price py-3 px-3">
                        {formatBDT(user.totalSpentBDT)}
                      </td>

                      <td className="py-3 px-3">
                        <StatusIndicator
                          tone={
                            user.status === 'active'
                              ? 'emerald'
                              : 'red'
                          }
                          label={
                            user.status === 'active'
                              ? 'Active'
                              : 'Suspended'
                          }
                        />
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(user.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PaginationFooter
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
