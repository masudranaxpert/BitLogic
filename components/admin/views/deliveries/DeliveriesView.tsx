'use client';

import React from 'react';
import type { DeliveriesViewProps } from './types';
import { useDeliveriesViewState } from './useDeliveriesViewState';
import { DeliveryFulfillModals } from './DeliveryFulfillModals';
import { DeliveryChatPanel } from './DeliveryChatPanel';
import { DeliveriesListPanel } from './DeliveriesListPanel';

export type { DeliveriesViewProps } from './types';

export default function DeliveriesView(props: DeliveriesViewProps) {
  const {
    vault,
    deliveries,
    payments = [],
    onSelectChatDelivery,
    onTogglePinOrder,
    pageTitle = 'Orders',
    pageMode = 'all',
  } = props;

  const state = useDeliveriesViewState(props);
  const { selectedChatDelivery } = state;

  const sharedModals = (
    <DeliveryFulfillModals vault={vault} state={state} />
  );

  if (selectedChatDelivery) {
    return (
      <>
        <DeliveryChatPanel
          delivery={selectedChatDelivery}
          payments={payments.filter(
            (p) =>
              p.orderId === selectedChatDelivery.orderId ||
              p.deliveryId === selectedChatDelivery.id,
          )}
          onSelectChatDelivery={onSelectChatDelivery}
          onTogglePinOrder={onTogglePinOrder}
          state={state}
        />
        {sharedModals}
      </>
    );
  }

  return (
    <>
      <DeliveriesListPanel
        deliveries={deliveries}
        vault={vault}
        onSelectChatDelivery={onSelectChatDelivery}
        onTogglePinOrder={onTogglePinOrder}
        pageTitle={pageTitle}
        pageMode={pageMode}
        state={state}
      />
      {sharedModals}
    </>
  );
}
