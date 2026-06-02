import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

// POST /api/auth/forgot-password  body: { email }
// Erzeugt ein Reset-Token (1h gültig) und sendet eine Reset-Mail.
// Antwortet immer generisch (verrät nicht, ob die E-Mail existiert).
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    let name: string | undefined;
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });
      name = user.name;
    } else {
      const parent = await prisma.parent.findUnique({ where: { email: normalized } });
      if (parent) {
        await prisma.parent.update({
          where: { id: parent.id },
          data: { resetToken: token, resetTokenExpiry: expiry },
        });
        name = `${parent.firstName} ${parent.lastName}`.trim();
      }
    }

    // Nur senden, wenn ein Konto existiert — aber immer generisch antworten
    if (name !== undefined) {
      const base = process.env.NEXT_PUBLIC_APP_URL || '';
      const resetUrl = `${base}/auth/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(normalized, resetUrl, name);
      } catch (e) {
        console.error('[forgot-password] Mailversand fehlgeschlagen:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Falls ein Konto existiert, wurde eine E-Mail mit Anleitung versendet.',
    });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
