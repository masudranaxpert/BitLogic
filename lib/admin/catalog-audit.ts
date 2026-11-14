export type ProductAuditEvent = {
  action:
    | 'product.create'
    | 'product.save'
    | 'product.plan_on'
    | 'product.plan_off'
    | 'product.plan_add'
    | 'product.plan_remove'
    | 'plan.link';
  entityType: 'product';
  entityId: string;
  summary: string;
};

export function planLinkAuditEvent(
  productName: string,
  productSlug: string,
  planLabel: string,
  linkCount: number,
): ProductAuditEvent {
  return {
    action: 'plan.link',
    entityType: 'product',
    entityId: productSlug,
    summary: `Linked ${linkCount} supplier source${linkCount === 1 ? '' : 's'} to plan "${planLabel}" on "${productName}"`,
  };
}

export type PlanSnapshot = {
  code: string;
  label: string;
  isActive: boolean;
  priceBdt: number;
};

export function planToggleAuditEvent(
  productName: string,
  productSlug: string,
  planLabel: string,
  isActive: boolean,
): ProductAuditEvent {
  return {
    action: isActive ? 'product.plan_on' : 'product.plan_off',
    entityType: 'product',
    entityId: productSlug,
    summary: `${isActive ? 'Turned ON' : 'Turned OFF'} plan "${planLabel}" on "${productName}"`,
  };
}

export function buildProductAuditEvents(args: {
  isNew: boolean;
  productName: string;
  productSlug: string;
  beforePlans: PlanSnapshot[];
  afterPlans: PlanSnapshot[];
  removedPlans: PlanSnapshot[];
  productFieldsChanged?: boolean;
}): ProductAuditEvent[] {
  const {
    isNew,
    productName,
    productSlug,
    beforePlans,
    afterPlans,
    removedPlans,
    productFieldsChanged = false,
  } = args;

  if (isNew) {
    const activeCount = afterPlans.filter((p) => p.isActive).length;
    return [
      {
        action: 'product.create',
        entityType: 'product',
        entityId: productSlug,
        summary: `Created product "${productName}" (${afterPlans.length} plans, ${activeCount} active)`,
      },
    ];
  }

  const events: ProductAuditEvent[] = [];
  const beforeByCode = new Map(beforePlans.map((p) => [p.code, p]));
  let otherPlanEdits = false;

  for (const plan of afterPlans) {
    const prev = beforeByCode.get(plan.code);
    if (!prev) {
      events.push({
        action: 'product.plan_add',
        entityType: 'product',
        entityId: productSlug,
        summary: `Added plan "${plan.label}" (৳${plan.priceBdt}, ${plan.isActive ? 'On' : 'Off'}) to "${productName}"`,
      });
      continue;
    }

    if (prev.isActive !== plan.isActive) {
      events.push(
        planToggleAuditEvent(productName, productSlug, plan.label, plan.isActive),
      );
    }

    if (prev.label !== plan.label || prev.priceBdt !== plan.priceBdt) {
      otherPlanEdits = true;
    }
  }

  for (const removed of removedPlans) {
    events.push({
      action: 'product.plan_remove',
      entityType: 'product',
      entityId: productSlug,
      summary: `Removed plan "${removed.label}" from "${productName}"`,
    });
  }

  if (events.length === 0 || productFieldsChanged || otherPlanEdits) {
    const onCount = afterPlans.filter((p) => p.isActive).length;
    const offCount = afterPlans.length - onCount;
    events.push({
      action: 'product.save',
      entityType: 'product',
      entityId: productSlug,
      summary:
        afterPlans.length > 0
          ? `Saved product "${productName}" (${onCount} on, ${offCount} off)`
          : `Saved product "${productName}" (0 plans)`,
    });
  }

  return events;
}
