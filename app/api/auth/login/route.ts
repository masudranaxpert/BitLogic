import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session';
import { ROLES, type Role } from '@/lib/auth/roles';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (
      !user?.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }

    const role = (user.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.CUSTOMER) as Role;
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role,
      },
    });
    return attachSessionCookie(response, token);
  } catch (error) {
    console.error('login failed', error);
    return NextResponse.json(
      { error: 'Could not sign you in. Please try again.' },
      { status: 500 },
    );
  }
}
