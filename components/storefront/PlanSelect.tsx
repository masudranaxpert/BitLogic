import React from 'react';
import { formatPrice, type Plan } from '@/lib/products';

type PlanSelectProps = {
  label: string;
  plans: Plan[];
  value: string;
  onChange: (planId: string) => void;
};

export function PlanSelect({ label, plans, value, onChange }: PlanSelectProps) {
  return (
    <div className="plan-select">
      <select
        className="plan-select-native"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">Choose an option</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {value ? (
        <p className="plan-selected-price" aria-live="polite">
          <span className="plan-selected-now">
            {formatPrice(plans.find((p) => p.id === value)?.price ?? 0)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
