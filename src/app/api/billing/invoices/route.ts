import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'KITA_LEITER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoices = await prisma.billingRecord.findMany({
      where: { kitaId: user.kitaId! },
      include: { child: { select: { firstName: true, lastName: true } } },
      orderBy: { month: 'desc' },
      take: 100,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'KITA_LEITER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { childId, month, baseAmount, extraDays = 0, extraDaysCost = 0, deductions = 0 } = body;

    if (!childId || !month || baseAmount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const child = await prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const totalAmount = baseAmount + extraDaysCost - deductions;

    const invoice = await prisma.billingRecord.create({
      data: {
        childId,
        kitaId: user.kitaId!,
        month: new Date(month),
        baseAmount,
        extraDays,
        extraDaysCost,
        deductions,
        totalAmount,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
