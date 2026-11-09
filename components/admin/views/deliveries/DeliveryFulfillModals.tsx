'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { VaultCredential } from '@/lib/admin-data';
import {
  getCredentialTypeLabel,
  SegmentedTabs,
  ModalShell,
  BBCodeEditor,
} from '@/components/admin/ui/primitives';
import type { DeliveriesViewState } from './useDeliveriesViewState';
import type { DigitalDelivery } from '@/lib/admin-data';
import type { DeliveriesViewProps } from './types';
import { SendOrderCredentialsModal } from './SendOrderCredentialsModal';

type DeliveryFulfillModalsProps = {
  deliveries: DigitalDelivery[];
  onFulfillDelivery: DeliveriesViewProps['onFulfillDelivery'];
  vault: VaultCredential[];
  state: DeliveriesViewState;
};

export function DeliveryFulfillModals({
  deliveries,
  onFulfillDelivery,
  vault,
  state,
}: DeliveryFulfillModalsProps) {
  const {
    activeActionDelivery,
    setActiveActionDelivery,
    sourceMode,
    setSourceMode,
    selectedVaultItemId,
    setSelectedVaultItemId,
    customSecret,
    setCustomSecret,
    customEmail,
    setCustomEmail,
    customPassword,
    setCustomPassword,
    customPin,
    setCustomPin,
    customNote,
    setCustomNote,
    handleConfirmFulfill,
    lightboxImage,
    setLightboxImage,
  } = state;

  const swap = Boolean(activeActionDelivery?.isWarrantySwap);
  return (
    <>
      <SendOrderCredentialsModal
        open={Boolean(activeActionDelivery) && !swap}
        delivery={activeActionDelivery && !swap ? activeActionDelivery.delivery : null}
        deliveries={deliveries}
        vault={vault}
        onFulfillDelivery={onFulfillDelivery}
        onClose={() => setActiveActionDelivery(null)}
      />
      <ModalShell
        open={Boolean(activeActionDelivery) && swap}
        onClose={() => setActiveActionDelivery(null)}
        title={
          activeActionDelivery?.isWarrantySwap
            ? `Warranty Replacement (${activeActionDelivery.delivery.orderId})`
            : `Send credential (${activeActionDelivery?.delivery.orderId})`
        }
        maxWidth="max-w-xl"
      >
        {activeActionDelivery &&
          (() => {
            const { delivery, isWarrantySwap } = activeActionDelivery;
            const availableVaultForVariant = vault.filter(
              (v) =>
                v.productId === delivery.productId &&
                v.variantId === delivery.variantId &&
                v.status === 'available'
            );

            return (
              <form onSubmit={handleConfirmFulfill} className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Source</span>
                  <SegmentedTabs
                    options={[
                      {
                        value: 'vault',
                        label: 'Credentials',
                        count: availableVaultForVariant.length,
                      },
                      { value: 'custom', label: 'Custom Input' },
                    ]}
                    value={sourceMode}
                    onChange={setSourceMode}
                  />
                </div>

                {sourceMode === 'vault' ? (
                  availableVaultForVariant.length > 0 ? (
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select credential
                      </label>
                      <select
                        value={selectedVaultItemId}
                        onChange={(e) => setSelectedVaultItemId(e.target.value)}
                        className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        {availableVaultForVariant.map((v) => (
                          <option key={v.id} value={v.id}>
                            [{v.id}] {v.secretValue.slice(0, 38)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                      No stocked credentials for this plan. Switch to custom input.
                    </div>
                  )
                ) : delivery.credentialType === 'email_login' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Email
                        </label>
                        <input
                          type="text"
                          required
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <input
                          type="text"
                          required
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Profile / PIN
                      </label>
                      <input
                        type="text"
                        value={customPin}
                        onChange={(e) => setCustomPin(e.target.value)}
                        className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {getCredentialTypeLabel(delivery.credentialType)}
                    </label>
                    <input
                      type="text"
                      required
                      value={customSecret}
                      onChange={(e) => setCustomSecret(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                )}

                <BBCodeEditor
                  label="Description"
                  value={customNote}
                  onChange={setCustomNote}
                  rows={3}
                  placeholder="Note for the buyer…"
                />

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveActionDelivery(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    {isWarrantySwap ? 'Confirm Swap' : 'Deliver'}
                  </button>
                </div>
              </form>
            );
          })()}
      </ModalShell>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attachment Preview
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950/5 dark:bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage}
                alt="Attachment preview"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
