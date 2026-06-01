import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendParentInvitationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

// POST /api/children/[id]/resend-invitation
// Sendet die Onboarding-Einladung an einen (oder alle) Elternteile des Kindes erneut.
// body (optional): { parentEmail }  — wenn gesetzt, nur an diesen Elternteil
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const child = await prisma.child.findFirst({
    where: { id: params.id, kitaId: session.user.kitaId },
    include: { parents: true },
  });
  if (!child) {
    return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
  }

  let targetEmail: string | undefined;
  try {
    const body = await request.json();
    targetEmail = body?.parentEmail;
  } catch {
    /* kein Body → alle Eltern */
  }

  const recipients = targetEmail
    ? child.parents.filter(p => p.email === targetEmail)
    : child.parents;

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Kein Elternteil hinterlegt' }, { status: 400 });
  }

  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (const parent of recipients) {
    try {
      // Neues temporäres Passwort setzen, damit der Login funktioniert
      const tempPassword =
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 6).toUpperCase();
      await prisma.parent.update({
        where: { id: parent.id },
        data: { password: await bcrypt.hash(tempPassword, 10) },
      });
      await sendParentInvitationEmail(parent.email, child.firstName, tempPassword);
      results.push({ email: parent.email, ok: true });
    } catch (e: any) {
      results.push({ email: parent.email, ok: false, error: e?.message || 'Fehler' });
    }
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  if (sent === 0) {
    return NextResponse.json(
      { error: 'Versand fehlgeschlagen', details: failed },
      { status: 502 }
    );
  }
  return NextResponse.json({ sent, results });
}
