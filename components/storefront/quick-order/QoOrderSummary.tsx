import React from 'react';
import { formatPrice } from '@/lib/products';

export type QoLineItem = {
  id: string;
  label: string;
  qty: number;
  unitPrice: number;
};

type QoOrderSummaryProps = {
  items: QoLineItem[];
};

export function QoOrderSummary({ items }: QoOrderSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  return (
    <section className="qo-summary" aria-label="Your order">
      <h3>Your order</h3>
      <div className="qo-summary-head">
        <span>Product</span>
        <span>Subtotal</span>
      </div>
      <ul className="qo-summary-list">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.label} × {item.qty}
            </span>
            <strong>{formatPrice(item.unitPrice * item.qty)}</strong>
          </li>
        ))}
      </ul>
      <div className="qo-summary-total">
        <span>Total</span>
        <strong>{formatPrice(total)}</strong>
      </div>
    </section>
  );
}
