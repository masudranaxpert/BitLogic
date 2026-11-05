import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/roles';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const name = body.name?.trim() || null;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name,
        phone: body.phone?.trim() || null,
        role: ROLES.CUSTOMER,
        passwordHash,
      },
    });

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: ROLES.CUSTOMER,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: ROLES.CUSTOMER,
      },
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error('register failed', error);
    return NextResponse.json(
      { error: 'Could not create your account. Please try again.' },
      { status: 500 },
    );
  }
}
