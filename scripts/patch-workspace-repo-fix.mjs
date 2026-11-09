import fs from 'node:fs';

let code = fs.readFileSync('lib/admin/workspace-repo.ts', 'utf8');

const targetSection = `    for (const p of items) {
      await tx.paymentTransaction.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          orderId: p.orderId,
          buyerName: p.buyerName,
          buyerEmail: p.buyerEmail,
          productSummary: p.productSummary,
          amountBdt: p.amountBDT,
          gateway: p.gateway,
          senderNumberOrRef: p.senderNumberOrRef,
          trxId: p.trxId,
          status: p.status,
          kind: p.kind || 'purchase',
          deliveryId: p.deliveryId || null,
          renewDeliveryIds: (p.renewDeliveryIds || []).join(','),
          createdAtLabel: p.createdAt,
          periodFrom: p.periodFrom || null,
          periodTo: p.periodTo || null,
          verifiedAtLabel: p.verifiedAt || null,
        },
        update: {
          status: p.status,
          kind: p.kind || 'purchase',
          deliveryId: p.deliveryId || null,
          ...(p.periodFrom ? { periodFrom: p.periodFrom, periodTo: p.periodTo || null } : {}),
          ...(p.verifiedAt ? { verifiedAtLabel: p.verifiedAt } : {}),
        },
      });
      const existingTx = await tx.paymentTransaction.findUnique({
        where: { id: p.id },
        select: { status: true, amountBdt: true, buyerEmail: true },
      });
      const wasVerified = existingTx?.status === 'verified';`;

const newSection = `    for (const p of items) {
      const existingTx = await tx.paymentTransaction.findUnique({
        where: { id: p.id },
        select: { status: true, amountBdt: true, buyerEmail: true },
      });
      const wasVerified = existingTx?.status === 'verified';

      await tx.paymentTransaction.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          orderId: p.orderId,
          buyerName: p.buyerName,
          buyerEmail: p.buyerEmail,
          productSummary: p.productSummary,
          amountBdt: p.amountBDT,
          gateway: p.gateway,
          senderNumberOrRef: p.senderNumberOrRef,
          trxId: p.trxId,
          status: p.status,
          kind: p.kind || 'purchase',
          deliveryId: p.deliveryId || null,
          renewDeliveryIds: (p.renewDeliveryIds || []).join(','),
          createdAtLabel: p.createdAt,
          periodFrom: p.periodFrom || null,
          periodTo: p.periodTo || null,
          verifiedAtLabel: p.verifiedAt || null,
        },
        update: {
          status: p.status,
          kind: p.kind || 'purchase',
          deliveryId: p.deliveryId || null,
          ...(p.periodFrom ? { periodFrom: p.periodFrom, periodTo: p.periodTo || null } : {}),
          ...(p.verifiedAt ? { verifiedAtLabel: p.verifiedAt } : {}),
        },
      });`;

code = code.replace(targetSection, newSection);
fs.writeFileSync('lib/admin/workspace-repo.ts', code, 'utf8');
console.log('Successfully fixed existingTx ordering in workspace-repo.ts');
