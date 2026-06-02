import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

// POST /api/auth/reset-password  body: { token, password }
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token und Passwort erforderlich' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben' }, { status: 400 });
    }

    const now = new Date();
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: now } },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hash, resetToken: null, resetTokenExpiry: null },
      });
      return NextResponse.json({ ok: true });
    }

    const parent = await prisma.parent.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: now } },
    });
    if (parent) {
      await prisma.parent.update({
        where: { id: parent.id },
        data: { password: hash, resetToken: null, resetTokenExpiry: null },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Link ungültig oder abgelaufen' }, { status: 400 });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
