import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/children/[id]/invoices — Rechnungen eines Kindes (Personal, mandantengescoped)
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const child = await prisma.child.findFirst({ where: { id: params.id, kitaId: user.kitaId } });
  if (!child) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const invoices = await prisma.billingRecord.findMany({
    where: { childId: params.id },
    orderBy: { month: 'desc' },
    select: { id: true, month: true, baseAmount: true, extraDaysCost: true, deductions: true, totalAmount: true, status: true },
  });
  return NextResponse.json(invoices);
}
