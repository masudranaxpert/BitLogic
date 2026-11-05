'use client';

import React, { useMemo, useState } from 'react';
import { useQuickOrder } from '@/context/QuickOrderContext';
import { QoCheckoutStep } from './QoCheckoutStep';
import { QoModalShell } from './QoModalShell';
import { QoPlanSelectStep } from './QoPlanSelectStep';

type Step = 'select' | 'checkout';

export function QuickOrderModal() {
  const { product, openKey, closeQuickOrder } = useQuickOrder();

  if (!product) return null;

  return (
    <QuickOrderModalInner
      key={`${product.id}-${openKey}`}
      onClose={closeQuickOrder}
    />
  );
}

function QuickOrderModalInner({ onClose }: { onClose: () => void }) {
  const { product, initialPlanId, initialQty } = useQuickOrder();

  if (!product) return null;

  const hasValidInitialPlan =
    Boolean(initialPlanId) &&
    product.plans.some((p) => p.id === initialPlanId);

  const [step, setStep] = useState<Step>(
    hasValidInitialPlan ? 'checkout' : 'select',
  );
  const [planId, setPlanId] = useState<string>(
    hasValidInitialPlan ? initialPlanId : '',
  );
  const [qty, setQty] = useState<number>(initialQty);

  const plan = useMemo(
    () => product.plans.find((p) => p.id === planId) ?? null,
    [product, planId],
  );

  return (
    <QoModalShell title={`Quick order — ${product.name}`} onClose={onClose}>
      {step === 'select' || !plan ? (
        <QoPlanSelectStep
          product={product}
          plan={plan}
          qty={qty}
          onChangeQty={setQty}
          onSelectPlan={setPlanId}
          onContinue={() => {
            if (plan) setStep('checkout');
          }}
        />
      ) : (
        <QoCheckoutStep
          product={product}
          plan={plan}
          qty={qty}
          onChangeQty={setQty}
          onBack={() => setStep('select')}
          onPlaced={onClose}
        />
      )}
    </QoModalShell>
  );
}
