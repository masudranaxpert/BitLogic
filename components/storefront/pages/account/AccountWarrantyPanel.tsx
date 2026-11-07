'use client';

import { ArrowUpRight, Plus } from 'lucide-react';
import {
  StatusBadge,
  StoreButton,
  StorePagination,
  StoreSearchBar,
  StoreSurfaceCard,
} from '@/components/storefront/ui';
import type { WarrantyClaimItem } from '@/components/storefront/pages/account/account-types';
import { CLAIMS_PER_PAGE } from '@/components/storefront/pages/account/account-utils';

type ClaimFilter = 'ALL' | 'In Review' | 'Resolved';

export type AccountWarrantyPanelProps = {
  claimSuccess: string | null;
  setClaimSuccess: (v: string | null) => void;
  claimSearch: string;
  setClaimSearch: (v: string) => void;
  claims: WarrantyClaimItem[];
  paginatedClaims: WarrantyClaimItem[];
  filteredClaims: WarrantyClaimItem[];
  currentClaimPage: number;
  totalClaimPages: number;
  claimFilter: ClaimFilter;
  setClaimFilter: (f: ClaimFilter) => void;
  setClaimPage: (p: number) => void;
  onOpenWarrantyClaimModal: () => void;
  onOpenOrderAccess: (orderId: string) => void;
};

export function AccountWarrantyPanel({
  claimSuccess,
  setClaimSuccess,
  claimSearch,
  setClaimSearch,
  claims,
  paginatedClaims,
  filteredClaims,
  currentClaimPage,
  totalClaimPages,
  claimFilter,
  setClaimFilter,
  setClaimPage,
  onOpenWarrantyClaimModal,
  onOpenOrderAccess,
}: AccountWarrantyPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1 className="text-lg font-bold text-slate-900 m-0">Warranty</h1>

        <div className="flex items-center gap-2">
          <StoreButton
            variant="dark"
            size="sm"
            onClick={() => onOpenWarrantyClaimModal()}
          >
            <Plus size={13} />
            <span>Claim Warranty</span>
          </StoreButton>
        </div>
      </div>

      {claimSuccess && (
        <div className="px-3.5 py-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{claimSuccess}</span>
          <button
            type="button"
            onClick={() => setClaimSuccess(null)}
            className="text-xs font-bold underline bg-transparent border-0 text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <StoreSearchBar
        value={claimSearch}
        onChange={(val) => {
          setClaimSearch(val);
          setClaimPage(1);
        }}
        placeholder="Search claims by ID, Order ID, product, or issue..."
        filters={[
          { id: 'ALL', label: 'All', count: claims.length },
          {
            id: 'In Review',
            label: 'In Review',
            count: claims.filter((c) => c.status === 'In Review').length,
          },
          {
            id: 'Resolved',
            label: 'Resolved',
            count: claims.filter((c) => c.status === 'Resolved').length,
          },
        ]}
        activeFilter={claimFilter}
        onFilterChange={(f) => {
          setClaimFilter(f);
          setClaimPage(1);
        }}
      />

      <StoreSurfaceCard padded={false} className="overflow-hidden">
        {paginatedClaims.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs font-semibold text-slate-500">
            No warranty claims found.
          </div>
        ) : (
          <>
            {/* Mobile Responsive Stacked Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-200">
              {paginatedClaims.map((claim) => {
                const issueTone =
                  claim.issueType === 'Deactivated Early'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : claim.issueType === 'Login / Password'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : claim.issueType === 'Profile PIN'
                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200';
                return (
                  <div key={claim.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {claim.productName}
                          </span>
                          <StatusBadge
                            tone={
                              claim.status === 'Resolved' ? 'emerald' : 'amber'
                            }
                          >
                            {claim.status}
                          </StatusBadge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-medium text-slate-600 tabular-nums">
                          <span className="font-bold text-slate-800">
                            {claim.id}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{claim.planName}</span>
                          <span className="text-slate-300">·</span>
                          <span>{claim.date}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenOrderAccess(claim.orderId)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 inline-flex items-center gap-1 cursor-pointer tabular-nums shrink-0"
                      >
                        <span>{claim.orderId}</span>
                        <ArrowUpRight size={11} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${issueTone}`}
                      >
                        {claim.issueType}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {claim.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Claim ID</th>
                    <th className="py-2.5 px-4">Order</th>
                    <th className="py-2.5 px-4">Product & Plan</th>
                    <th className="py-2.5 px-4">Issue</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {paginatedClaims.map((claim) => {
                    const issueTone =
                      claim.issueType === 'Deactivated Early'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : claim.issueType === 'Login / Password'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : claim.issueType === 'Profile PIN'
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200';
                    return (
                      <tr
                        key={claim.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {claim.id}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenOrderAccess(claim.orderId)}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-800 inline-flex items-center gap-1 cursor-pointer tabular-nums"
                          >
                            <span>{claim.orderId}</span>
                            <ArrowUpRight size={11} />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {claim.productName}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-600">
                            {claim.planName}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded border font-semibold ${issueTone}`}
                          >
                            {claim.issueType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 max-w-[260px]">
                          {claim.description}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                          {claim.date}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <StatusBadge
                            tone={
                              claim.status === 'Resolved' ? 'emerald' : 'amber'
                            }
                          >
                            {claim.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </StoreSurfaceCard>

      <StorePagination
        currentPage={currentClaimPage}
        totalPages={totalClaimPages}
        totalItems={filteredClaims.length}
        pageSize={CLAIMS_PER_PAGE}
        onPageChange={setClaimPage}
      />
    </div>
  );
}
