import { NextResponse } from 'next/server';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { db } from '@/lib/db';
import { getBuyerAccess } from '@/lib/auth/buyer-access';
import { accessTokensMatch } from '@/lib/orders/access-token';
import { randomBytes } from 'node:crypto';

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ tickets: [] });
    }

    const cleanEmail = email.trim().toLowerCase();
    const access = await getBuyerAccess();
    if (access.kind === 'guest' || (access.kind === 'member' && access.email !== cleanEmail)) {
      return NextResponse.json({ tickets: [] });
    }
    const tickets = await db.supportTicket.findMany({
      where: { buyerEmail: cleanEmail },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        orderId: t.orderId,
        category: t.category,
        priority: t.priority,
        status: t.status,
        updatedAt: t.updatedAtLabel,
        unreadCount: t.unreadCount,
        messages: parseJson(t.messagesJson, []),
      })),
    });
  } catch (err) {
    console.error('[api/account/tickets GET]', err);
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!rateLimit(`tickets:${clientIp(request)}`, 20, 10 * 60_000).ok) {
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
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const updatedAtLabel = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // 1. Reply to existing ticket
    if (body.ticketId) {
      const ticket = await db.supportTicket.findUnique({
        where: { id: String(body.ticketId).trim() },
      });
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      const access = await getBuyerAccess();
      const proof =
        access.kind === 'member'
          ? access.email
          : String(body.buyerEmail || '')
              .trim()
              .toLowerCase();
      if (access.kind !== 'admin' && proof !== ticket.buyerEmail.toLowerCase()) {
        return NextResponse.json(
          { error: 'Not allowed for this ticket.' },
          { status: 403 },
        );
      }
      if (access.kind === 'guest') {
        const order = await db.order.findUnique({
          where: { id: ticket.orderId },
          select: { accessToken: true },
        });
        if (!accessTokensMatch(order?.accessToken, body.accessToken)) {
          return NextResponse.json(
            { error: 'Not allowed for this ticket.' },
            { status: 403 },
          );
        }
      }
      if (!String(body.message || '').trim()) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
      }

      const newMsg = {
        id: `tmsg-${Date.now()}`,
        sender: 'customer',
        senderName: body.senderName || body.buyerName || 'You',
        text: String(body.message || '').trim(),
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      };

      await db.$transaction(async (tx) => {
        const fresh = await tx.supportTicket.findUnique({
          where: { id: ticket.id },
        });
        if (!fresh) return;
        const existingMsgs = parseJson<any[]>(fresh.messagesJson, []);
        await tx.supportTicket.update({
          where: { id: ticket.id },
          data: {
            messagesJson: JSON.stringify([...existingMsgs, newMsg]),
            status: 'Open',
            updatedAtLabel,
            unreadCount: { increment: 1 },
          },
        });
      });

      await db.adminNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          type: 'ticket',
          ticketId: ticket.id,
          orderId: ticket.orderId,
          title: `Reply on Ticket ${ticket.id}`,
          message: `${body.senderName || 'Customer'}: "${String(body.message || '').trim().slice(0, 60)}"`,
          timeLabel: 'Just now',
          read: false,
        },
      });

      return NextResponse.json({ ok: true, message: newMsg });
    }

    const {
      subject,
      orderId,
      category = 'Access & Delivery',
      priority = 'Normal',
      message,
      buyerName,
      buyerEmail,
      buyerPhone = '',
    } = body;

    if (!subject || !orderId || !message || !buyerEmail) {
      return NextResponse.json(
        { error: 'Subject, Order ID, message, and email are required' },
        { status: 400 },
      );
    }

    const access = await getBuyerAccess();
    const cleanEmail = String(buyerEmail).trim().toLowerCase();
    const cleanOrd = String(orderId).trim();
    if (access.kind === 'member' && access.email !== cleanEmail) {
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    }
    if (access.kind === 'guest') {
      const order = await db.order.findUnique({
        where: { id: cleanOrd },
        select: { accessToken: true },
      });
      if (!accessTokensMatch(order?.accessToken, body.accessToken)) {
        return NextResponse.json(
          { error: 'Order access token required.' },
          { status: 403 },
        );
      }
    }

    const ticketId = `TCK-${randomBytes(4).toString('hex').toUpperCase().slice(0, 7)}`;

    const initialMessages = [
      {
        id: `tmsg-${Date.now()}-1`,
        sender: 'customer',
        senderName: buyerName || 'You',
        text: message,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      },
    ];

    const ticket = await db.supportTicket.create({
      data: {
        id: ticketId,
        subject: String(subject).trim(),
        orderId: String(orderId).trim(),
        buyerName: buyerName || 'Customer',
        buyerEmail: cleanEmail,
        buyerPhone: buyerPhone || '',
        productName: `Order ${orderId}`,
        category,
        priority,
        status: 'Open',
        updatedAtLabel,
        unreadCount: 1,
        messagesJson: JSON.stringify(initialMessages),
      },
    });

    await db.adminNotification.create({
      data: {
        id: `notif-${Date.now()}`,
        type: 'ticket',
        ticketId,
        orderId: String(orderId).trim(),
        title: `New Ticket ${ticketId} — ${subject}`,
        message: `${buyerName || 'Customer'} opened a ticket for ${orderId}: "${message.slice(0, 60)}"`,
        timeLabel: 'Just now',
        read: false,
      },
    });

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        orderId: ticket.orderId,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        updatedAt: ticket.updatedAtLabel,
        messages: initialMessages,
      },
    });
  } catch (err) {
    console.error('[api/account/tickets POST]', err);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
