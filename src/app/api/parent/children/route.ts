import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || (session.user as any).type !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { include: { location: true } } },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    // Heutige Anwesenheit der eigenen Kinder ermitteln
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ids = parent.children.map((c) => c.id);
    const att = ids.length
      ? await prisma.attendance.findMany({
          where: { childId: { in: ids }, date: { gte: today, lt: tomorrow } },
        })
      : [];

    const children = parent.children.map((c) => ({
      ...c,
      present: att.some((a) => a.childId === c.id && a.checkInTime && !a.checkOutTime),
    }));

    return NextResponse.json(children);
  } catch (error) {
    console.error('Get parent children error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
