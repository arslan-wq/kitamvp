import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { sendBookingDecisionEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notify';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/extra-days/[id] — Personal bestätigt/lehnt Zusatztag ab
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || user.role === 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const status = body.status as string;
  if (!['APPROVED', 'REJECTED'].includes(status)) return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });

  const ed = await prisma.extraDay.findFirst({ where: { id: params.id, kitaId: user.kitaId }, include: { child: { include: { parents: { select: { id: true, email: true, firstName: true } } } } } });
  if (!ed) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const updated = await prisma.extraDay.update({ where: { id: params.id }, data: { status } });

  // Eltern benachrichtigen (E-Mail + Glocke)
  const childName = `${ed.child.firstName} ${ed.child.lastName}`;
  const label = `Zusatztag ${new Date(ed.date).toLocaleDateString('de-CH')}`;
  const approved = status === 'APPROVED';
  try {
    await Promise.allSettled(ed.child.parents.map((p) =>
      sendBookingDecisionEmail(p.email, { parentName: p.firstName, childName, periodLabel: label, approved })
    ));
  } catch { /* best effort */ }
  await createNotifications({
    kitaId: ed.kitaId,
    recipientIds: ed.child.parents.map((p) => p.id),
    type: 'BOOKING_DECISION',
    title: approved ? `Zusatztag bestätigt: ${childName}` : `Zusatztag abgelehnt: ${childName}`,
    message: label,
    link: '/extra-days',
  });

  return NextResponse.json(updated);
}

// DELETE /api/extra-days/[id] — Eltern (eigenes Kind) oder Personal
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ed = await prisma.extraDay.findUnique({ where: { id: params.id } });
  if (!ed) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const access = await resolveChildAccess(session.user.email, ed.childId);
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.extraDay.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
