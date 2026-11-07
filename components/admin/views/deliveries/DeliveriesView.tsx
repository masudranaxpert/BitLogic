'use client';

import React from 'react';
import type { DeliveriesViewProps } from './types';
import { useDeliveriesViewState } from './useDeliveriesViewState';
import { DeliveryFulfillModals } from './DeliveryFulfillModals';
import { DeliveriesListPanel } from './DeliveriesListPanel';
import { OrderDetailView } from './OrderDetailView';

export type { DeliveriesViewProps } from './types';

export default function DeliveriesView(props: DeliveriesViewProps) {
  const {
    products,
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
    <DeliveryFulfillModals
      deliveries={deliveries}
      onFulfillDelivery={props.onFulfillDelivery}
      vault={vault}
      state={state}
    />
  );

  if (selectedChatDelivery) {
    const orderId = selectedChatDelivery.orderId;
    const units = deliveries
      .filter((d) => d.orderId === orderId)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const unitIds = new Set(units.map((u) => u.id));
    return (
      <>
        <OrderDetailView
          key={orderId}
          delivery={selectedChatDelivery}
          units={units}
          products={products}
          payments={payments.filter(
            (p) => p.orderId === orderId || (p.deliveryId && unitIds.has(p.deliveryId)),
          )}
          state={state}
          onBack={() => onSelectChatDelivery?.(null)}
          onTogglePinOrder={onTogglePinOrder}
          onVerifyPayment={props.onVerifyPayment}
          onRejectPayment={props.onRejectPayment}
          onRefundOrder={props.onRefundOrder}
          onMarkChatRead={props.onMarkOrderChatRead}
          onSetWarrantyStart={props.onSetWarrantyStart}
          onUpdateDeliveryVpn={props.onUpdateDeliveryVpn}
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
