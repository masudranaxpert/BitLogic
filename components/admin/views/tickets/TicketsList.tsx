'use client';

import React, { useEffect, useState } from 'react';
import { PlusCircle, ArrowUpRight } from 'lucide-react';
import { AdminSupportTicket } from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  PaginationFooter,
  EmptyTableState,
} from '@/components/admin/ui/primitives';

interface TicketsListProps {
  tickets: AdminSupportTicket[];
  filteredTickets: AdminSupportTicket[];
  statusFilter: 'all' | 'open' | 'answered' | 'closed';
  priorityFilter: 'all' | 'Urgent' | 'High' | 'Normal';
  searchQuery: string;
  showStatistics: boolean;
  openCount: number;
  answeredCount: number;
  closedCount: number;
  urgentOrHighCount: number;
  onStatusFilterChange: (value: 'all' | 'open' | 'answered' | 'closed') => void;
  onPriorityFilterChange: (value: 'all' | 'Urgent' | 'High' | 'Normal') => void;
  onSearchQueryChange: (value: string) => void;
  onShowStatisticsChange: (value: boolean) => void;
  onSelectTicket: (ticketId: string) => void;
  onOpenCreate: () => void;
  onOpenOrderChat: (orderId: string, deliveryId?: string) => void;
  onResetFilters: () => void;
}

export function TicketsList({
  tickets,
  filteredTickets,
  statusFilter,
  priorityFilter,
  searchQuery,
  showStatistics,
  openCount,
  answeredCount,
  closedCount,
  urgentOrHighCount,
  onStatusFilterChange,
  onPriorityFilterChange,
  onSearchQueryChange,
  onShowStatisticsChange,
  onSelectTicket,
  onOpenCreate,
  onOpenOrderChat,
  onResetFilters,
}: TicketsListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => setPage(1), [filteredTickets.length]);
  const paged = filteredTickets.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Support Tickets
        </h1>

        <button
          type="button"
          onClick={onOpenCreate}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Create Ticket</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search ticket ID, order, or buyer..."
            className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 w-full sm:w-64"
          />

          <select
            value={priorityFilter}
            onChange={(e) =>
              onPriorityFilterChange(
                e.target.value as 'all' | 'Urgent' | 'High' | 'Normal'
              )
            }
            aria-label="Filter by priority"
            className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent Only</option>
            <option value="High">High Only</option>
            <option value="Normal">Normal Only</option>
          </select>

          <SwitchToggle
            checked={showStatistics}
            onChange={onShowStatisticsChange}
            label="Stats"
          />
        </div>

        <SegmentedTabs
          options={[
            { value: 'all', label: 'All', count: tickets.length },
            { value: 'open', label: 'Open', count: openCount },
            { value: 'answered', label: 'Answered', count: answeredCount },
            { value: 'closed', label: 'Closed', count: closedCount },
          ]}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Tickets" value={tickets.length} />
          <StatMetric
            label="Open Queue"
            value={openCount}
            badge={openCount > 0 ? 'Needs reply' : undefined}
            tone={openCount > 0 ? 'amber' : 'emerald'}
          />
          <StatMetric
            label="Urgent / High"
            value={urgentOrHighCount}
            badge={urgentOrHighCount > 0 ? 'Priority' : undefined}
            tone={urgentOrHighCount > 0 ? 'amber' : 'emerald'}
          />
          <StatMetric label="Answered" value={answeredCount} />
        </Card>
      )}

      {tickets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState title="No tickets" />
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title="No matches"
            onReset={onResetFilters}
            resetLabel="Clear filters"
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4 whitespace-nowrap">Ticket ID</th>
                  <th className="py-3 px-3 whitespace-nowrap">Subject &amp; Category</th>
                  <th className="py-3 px-3 whitespace-nowrap">Buyer</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order</th>
                  <th className="py-3 px-3 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Updated</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {paged.map((tkt) => {
                  const unread = tkt.unreadCount || 0;
                  return (
                    <tr
                      key={tkt.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center gap-1.5">
                          <span>{tkt.id}</span>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-sans font-semibold">
                              {unread} new
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-normal">
                          {tkt.subject}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {tkt.category} · {tkt.productName}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {tkt.buyerName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {tkt.buyerEmail}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => onOpenOrderChat(tkt.orderId, tkt.deliveryId)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{tkt.orderId}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        {tkt.priority === 'Urgent' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                            Urgent
                          </span>
                        )}
                        {tkt.priority === 'High' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                            High
                          </span>
                        )}
                        {tkt.priority === 'Normal' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {tkt.status === 'open' && (
                          <StatusIndicator tone="amber" label="Open" />
                        )}
                        {tkt.status === 'answered' && (
                          <StatusIndicator tone="emerald" label="Answered" />
                        )}
                        {tkt.status === 'closed' && (
                          <StatusIndicator tone="zinc" label="Closed" />
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {tkt.updatedAt}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectTicket(tkt.id)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 cursor-pointer ${
                            tkt.status === 'open'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-900 dark:bg-slate-800 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          <span>Open</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-200/80 dark:divide-slate-800">
            {paged.map((tkt) => (
              <div key={tkt.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {tkt.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenOrderChat(tkt.orderId, tkt.deliveryId)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{tkt.orderId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  {tkt.status === 'open' && (
                    <StatusIndicator tone="amber" label="Open" />
                  )}
                  {tkt.status === 'answered' && (
                    <StatusIndicator tone="emerald" label="Answered" />
                  )}
                  {tkt.status === 'closed' && (
                    <StatusIndicator tone="zinc" label="Closed" />
                  )}
                </div>

                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {tkt.subject}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {tkt.buyerName} · {tkt.category}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-[11px] text-slate-400">
                    {tkt.updatedAt}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTicket(tkt.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Ticket</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <PaginationFooter
          totalItems={filteredTickets.length}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
        </Card>
      )}
    </div>
  );
}
