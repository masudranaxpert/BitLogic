import React from 'react';
import { Minus, Plus } from 'lucide-react';

type QoQtyControlProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
};

export function QoQtyControl({
  value,
  onChange,
  min = 1,
  max = 20,
}: QoQtyControlProps) {
  return (
    <div className="qo-qty" role="group" aria-label="Quantity">
      <button
        type="button"
        className="qo-qty-btn"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <span className="qo-qty-value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="qo-qty-btn"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
