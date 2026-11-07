import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { db } from '@/lib/db';
import { getBuyerAccess, sameEmail } from '@/lib/auth/buyer-access';
import { getSession } from '@/lib/auth/session';
import { canAccessPermission } from '@/lib/auth/permissions';
import { accessTokensMatch } from '@/lib/orders/access-token';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  if (!rateLimit(`chat:${clientIp(request)}`, 40, 5 * 60_000).ok) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a valid JSON object' }, { status: 400 });
  }

  try {
    const {
      orderId,
      deliveryId,
      text,
      senderName = 'You',
      attachment,
      buyerEmail,
      accessToken,
    } = body;
    const access = await getBuyerAccess();
    // Staff with orders permission may post as console support (not via buyer "admin" elevate).
    let consoleSupport = access.kind === 'admin';
    if (!consoleSupport && body.sender === 'admin') {
      const session = await getSession();
      if (
        session &&
        canAccessPermission(session.role, session.permissions, 'orders')
      ) {
        consoleSupport = true;
      }
    }
    const sender = consoleSupport && body.sender === 'admin' ? 'admin' : 'customer';

    if (!orderId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Order ID and text are required' },
        { status: 400 },
      );
    }

    const cleanOrd = String(orderId).trim();
    const cleanText = String(text).trim();

    const deliveries = await db.digitalDelivery.findMany({
      where: deliveryId ? { id: deliveryId } : { orderId: cleanOrd },
    });

    if (deliveries.length === 0) {
      return NextResponse.json(
        { error: `No deliveries found for order ${cleanOrd}` },
        { status: 404 },
      );
    }

    if (!consoleSupport) {
      const proofEmail = access.kind === 'member' ? access.email : buyerEmail;
      if (!deliveries.every((d) => sameEmail(d.buyerEmail, proofEmail))) {
        return NextResponse.json(
          { error: 'Not allowed for this order.' },
          { status: 403 },
        );
      }
      if (access.kind === 'guest') {
        const order = await db.order.findUnique({
          where: { id: cleanOrd },
          select: { accessToken: true },
        });
        if (!accessTokensMatch(order?.accessToken, accessToken)) {
          return NextResponse.json(
            { error: 'Not allowed for this order.' },
            { status: 403 },
          );
        }
      }
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newMsg = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender: sender === 'admin' ? 'support' : 'customer',
      senderName,
      text: cleanText,
      time: timeLabel,
      ...(attachment ? { attachment } : {}),
    };

    // Serialize read-modify-write so concurrent posts do not drop messages.
    await db.$transaction(async (tx) => {
      for (const d of deliveries) {
        const fresh = await tx.digitalDelivery.findUnique({
          where: { id: d.id },
          select: { chatMessagesJson: true, unreadChatCount: true },
        });
        if (!fresh) continue;
        const existing = parseJson<unknown[]>(fresh.chatMessagesJson, []);
        const updated = [...existing, newMsg];
        const unreadCount =
          sender === 'customer' ? (fresh.unreadChatCount || 0) + 1 : 0;
        await tx.digitalDelivery.update({
          where: { id: d.id },
          data: {
            chatMessagesJson: JSON.stringify(updated),
            unreadChatCount: unreadCount,
          },
        });
      }
      if (sender === 'customer') {
        await tx.adminNotification.create({
          data: {
            id: `notif-${Date.now()}`,
            type: 'order_chat',
            orderId: cleanOrd,
            title: `New message on ${cleanOrd}`,
            message: `${senderName}: "${cleanText.slice(0, 80)}"`,
            timeLabel: 'Just now',
            read: false,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: newMsg,
    });
  } catch (err) {
    console.error('[api/orders/chat POST]', err);
    return NextResponse.json(
      { error: 'Failed to post order message' },
      { status: 500 },
    );
  }
}
