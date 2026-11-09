import { db } from '@/lib/db';
import type { WorkspacePatch } from '@/lib/admin/workspace-repo';
import { recordActivities, type ActivityInput } from '@/lib/audit/record';

function blank(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function short(text: string) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return 'a message';
  return t.length > 120 ? `${t.slice(0, 117)}...` : t;
}

function chatItems(raw: unknown): { id: string; sender: string; text: string }[] {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { id?: unknown; sender?: unknown; text?: unknown };
    if (typeof row.id !== 'string') return [];
    return [{
      id: row.id,
      sender: typeof row.sender === 'string' ? row.sender : '',
      text: typeof row.text === 'string' ? row.text : '',
    }];
  });
}

/** Diff a workspace save into staff actions. Unchanged autosaves write nothing. */
export async function auditWorkspacePatch(
  userId: string,
  ip: string,
  patch: WorkspacePatch,
) {
  const rows: ActivityInput[] = [];
  const actor = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true },
  });
  const actorName = actor?.name || actor?.email || 'Staff';
  const actorRole = actor?.role === 'ADMIN' ? 'Admin' : 'Staff';
  const actorLabel = `${actorName} (${actorRole})`;

  if (patch.deliveries?.length) {
    const prev = await db.digitalDelivery.findMany({
      select: {
        id: true,
        orderId: true,
        status: true,
        vaultCredentialId: true,
        productName: true,
        variantName: true,
        buyerName: true,
        buyerEmail: true,
        chatMessagesJson: true,
      },
    });
    const byId = new Map(prev.map((row) => [row.id, row]));
    for (const next of patch.deliveries) {
      const old = byId.get(next.id);
      const name = `${next.productName} · ${next.variantName}`;
      const who = next.buyerName || next.buyerEmail || '';
      const vault = next.vaultCredentialId || next.credentialPayload?.vaultCredentialId || '';
      const noteMessages = (known: Set<string>) => {
        for (const msg of chatItems(next.chatMessages)) {
          if (msg.sender !== 'admin' || known.has(msg.id)) continue;
          rows.push({
            userId,
            ip,
            action: 'order.message',
            entityType: 'order',
            entityId: next.orderId,
            summary: `Messaged ${who || 'the buyer'} on ${next.orderId}: ${short(msg.text)}`,
          });
        }
      };
      if (!old) {
        rows.push({
          userId,
          ip,
          action: 'order.create',
          entityType: 'order',
          entityId: next.orderId,
          summary: `Created ${next.orderId} · ${name}`,
        });
        noteMessages(new Set());
        continue;
      }
      const oldVault = old.vaultCredentialId || '';
      if (oldVault !== vault) {
        rows.push({
          userId,
          ip,
          action: vault ? 'order.assign' : 'order.clear',
          entityType: 'order',
          entityId: next.orderId,
          summary: vault
            ? `Gave a credential on ${next.orderId} · ${name}${who ? ` to ${who}` : ''}`
            : `Cleared the credential on ${next.orderId} · ${name}${who ? ` · ${who}` : ''}`,
        });
      }
      if (old.status !== next.status) {
        const refunded = next.status === 'refunded';
        rows.push({
          userId,
          ip,
          action: refunded ? 'order.refund' : 'order.status',
          entityType: 'order',
          entityId: next.orderId,
          summary: refunded
            ? `Refunded ${next.orderId} · ${name}${who ? ` · ${who}` : ''}`
            : `${next.orderId} · ${name}: ${old.status} to ${next.status}`,
        });
      }
      noteMessages(new Set(chatItems(old.chatMessagesJson).map((msg) => msg.id)));
    }
  }

  if (patch.payments?.length) {
    const prev = await db.paymentTransaction.findMany({
      select: { id: true, orderId: true, status: true, trxId: true, gateway: true },
    });
    const byId = new Map(prev.map((row) => [row.id, row]));
    for (const next of patch.payments) {
      const old = byId.get(next.id);
      const who = next.buyerName || next.buyerEmail || '';
      const amount = Number.isFinite(next.amountBDT) ? `৳${next.amountBDT}` : '';
      const trxPart = next.trxId && next.trxId !== '—' ? ` · TrxID ${next.trxId}` : '';
      if (!old) {
        const refund = next.status === 'refunded';
        rows.push({
          userId,
          ip,
          action: refund ? 'payment.refund' : 'payment.create',
          entityType: 'order',
          entityId: next.orderId,
          summary: refund
            ? `[MANUAL REFUND by ${actorLabel}] Refunded ${amount} on ${next.orderId}${who ? ` · ${who}` : ''}`
            : `[MANUAL ENTRY by ${actorLabel}] Added ${next.gateway} payment (${amount}${trxPart}) on ${next.orderId}${who ? ` · ${who}` : ''}`,
        });
        continue;
      }
      if (old.status !== next.status) {
        if (next.status === 'verified') {
          rows.push({
            userId,
            ip,
            action: 'payment.manual_verify',
            entityType: 'order',
            entityId: next.orderId,
            summary: `[MANUAL VERIFY by ${actorLabel}] Approved ${amount} via ${next.gateway}${trxPart} on ${next.orderId}${who ? ` · ${who}` : ''}`,
          });
        } else if (next.status === 'rejected') {
          rows.push({
            userId,
            ip,
            action: 'payment.reject',
            entityType: 'order',
            entityId: next.orderId,
            summary: `[MANUAL REJECT by ${actorLabel}] Rejected ${amount} via ${next.gateway}${trxPart} on ${next.orderId}${who ? ` · ${who}` : ''}`,
          });
        } else if (next.status === 'refunded') {
          rows.push({
            userId,
            ip,
            action: 'payment.refund',
            entityType: 'order',
            entityId: next.orderId,
            summary: `[MANUAL REFUND by ${actorLabel}] Refunded ${amount} on ${next.orderId}${who ? ` · ${who}` : ''}`,
          });
        } else {
          rows.push({
            userId,
            ip,
            action: 'payment.status',
            entityType: 'order',
            entityId: next.orderId,
            summary: `[${actorLabel}] ${next.orderId} payment ${old.status} → ${next.status}`,
          });
        }
      }
    }
  }

  if (patch.tickets?.length) {
    const prev = await db.supportTicket.findMany({
      select: { id: true, status: true, subject: true, priority: true, messagesJson: true },
    });
    const byId = new Map(prev.map((row) => [row.id, row]));
    for (const next of patch.tickets) {
      const old = byId.get(next.id);
      const subject = blank(next.subject) || 'ticket';
      const noteReplies = (known: Set<string>) => {
        for (const msg of chatItems(next.messages)) {
          if (msg.sender !== 'admin' || known.has(msg.id)) continue;
          rows.push({
            userId,
            ip,
            action: 'ticket.reply',
            entityType: 'ticket',
            entityId: next.id,
            summary: `Replied on ${subject}: ${short(msg.text)}`,
          });
        }
      };
      if (!old) {
        rows.push({
          userId,
          ip,
          action: 'ticket.create',
          entityType: 'ticket',
          entityId: next.id,
          summary: `Opened ticket ${subject}`,
        });
        noteReplies(new Set());
        continue;
      }
      if (old.priority !== next.priority) {
        rows.push({
          userId,
          ip,
          action: 'ticket.priority',
          entityType: 'ticket',
          entityId: next.id,
          summary: `Ticket ${subject}: ${old.priority} to ${next.priority}`,
        });
      }
      if (old.status !== next.status) {
        rows.push({
          userId,
          ip,
          action: 'ticket.status',
          entityType: 'ticket',
          entityId: next.id,
          summary: `Ticket ${subject}: ${old.status} to ${next.status}`,
        });
      }
      noteReplies(new Set(chatItems(old.messagesJson).map((msg) => msg.id)));
    }
  }

  if (patch.subscribers?.length) {
    const prev = await db.adminSubscriber.findMany({
      select: { id: true, name: true, email: true, phone: true, status: true },
    });
    const byId = new Map(prev.map((row) => [row.id, row]));
    for (const next of patch.subscribers) {
      const old = byId.get(next.id);
      const name = next.name || next.email;
      if (!old) {
        rows.push({
          userId,
          ip,
          action: 'customer.create',
          entityType: 'customer',
          entityId: next.id,
          summary: `Added customer ${name}`,
        });
        continue;
      }
      if (old.status !== next.status) {
        rows.push({
          userId,
          ip,
          action: 'customer.status',
          entityType: 'customer',
          entityId: next.id,
          summary: next.status === 'suspended' ? `Suspended ${name}` : `Set ${name} to ${next.status}`,
        });
      }
      if (old.name !== next.name || old.email !== next.email || old.phone !== next.phone) {
        rows.push({
          userId,
          ip,
          action: 'customer.update',
          entityType: 'customer',
          entityId: next.id,
          summary: `Updated ${name}`,
        });
      }
    }
  }

  if (patch.coupons) {
    const prev = await db.couponCode.findMany({
      select: { id: true, code: true, status: true, discountType: true, discountValue: true, minSpendBdt: true },
    });
    const byId = new Map(prev.map((row) => [row.id, row]));
    const nextIds = new Set(patch.coupons.map((c) => c.id));
    for (const next of patch.coupons) {
      const old = byId.get(next.id);
      if (!old) {
        rows.push({
          userId,
          ip,
          action: 'coupon.create',
          entityType: 'coupon',
          entityId: next.id,
          summary: `Created coupon ${next.code} (${next.discountType === 'percentage' ? `${next.discountValue}%` : `৳${next.discountValue}`})`,
        });
        continue;
      }
      if (old.status !== next.status) {
        rows.push({
          userId,
          ip,
          action: 'coupon.status',
          entityType: 'coupon',
          entityId: next.id,
          summary: `Coupon ${next.code}: ${old.status} to ${next.status}`,
        });
      }
      if (old.discountValue !== next.discountValue || old.minSpendBdt !== next.minSpendBDT) {
        rows.push({
          userId,
          ip,
          action: 'coupon.update',
          entityType: 'coupon',
          entityId: next.id,
          summary: `Updated coupon ${next.code} (${next.discountValue}, min ৳${next.minSpendBDT})`,
        });
      }
    }
    for (const old of prev) {
      if (!nextIds.has(old.id)) {
        rows.push({
          userId,
          ip,
          action: 'coupon.delete',
          entityType: 'coupon',
          entityId: old.id,
          summary: `Deleted coupon ${old.code}`,
        });
      }
    }
  }

  if (patch.vault) {
    const prev = await db.vaultCredential.findMany({
      select: { id: true, email: true, productName: true, variantName: true, status: true },
    });
    const byId = new Map(prev.map((row) => [row.id, row]));
    const nextIds = new Set(patch.vault.map((v) => v.id));
    let addedCount = 0;
    for (const next of patch.vault) {
      const old = byId.get(next.id);
      if (!old) {
        addedCount++;
        continue;
      }
      if (old.status !== next.status) {
        rows.push({
          userId,
          ip,
          action: 'vault.status',
          entityType: 'vault',
          entityId: next.id,
          summary: `Vault ${next.email || next.variantName} (${next.productName}): ${old.status} to ${next.status}`,
        });
      }
    }
    if (addedCount > 0) {
      rows.push({
        userId,
        ip,
        action: 'vault.add',
        entityType: 'vault',
        summary: `Added ${addedCount} credential(s) to Vault`,
      });
    }
    let deletedCount = 0;
    for (const old of prev) {
      if (!nextIds.has(old.id)) {
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      rows.push({
        userId,
        ip,
        action: 'vault.delete',
        entityType: 'vault',
        summary: `Removed ${deletedCount} credential(s) from Vault`,
      });
    }
  }

  await recordActivities(rows);
}
