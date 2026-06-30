import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];

// PATCH /api/billing/invoices/[id] — Status ändern (Admin/Leitung), mandantengescoped.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || !['ADMIN', 'KITA_LEITER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status as string;
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });

  const rec = await prisma.billingRecord.findFirst({ where: { id: params.id, kitaId: user.kitaId } });
  if (!rec) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const updated = await prisma.billingRecord.update({
    where: { id: params.id },
    data: { status: status as any, paidDate: status === 'PAID' ? new Date() : null },
    select: { id: true, status: true, paidDate: true },
  });
  return NextResponse.json(updated);
}
