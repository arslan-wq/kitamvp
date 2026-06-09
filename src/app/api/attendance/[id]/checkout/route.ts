import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  __request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const child = await prisma.child.findFirst({
    where: { id: params.id, kitaId: session.user.kitaId },
  });

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await prisma.attendance.findFirst({
    where: {
      childId: params.id,
      date: { gte: today, lt: tomorrow },
    },
  });

  const now = new Date();
  // Kinder gelten standardmäßig als anwesend; „Abgang" markiert nur die Abholung.
  // Existiert noch kein Datensatz für heute, wird er beim Abgang angelegt.
  if (!attendance) {
    const created = await prisma.attendance.create({
      data: {
        childId: params.id,
        date: today,
        checkInTime: today, // anwesend ab Tagesbeginn (kein separates Check-in mehr)
        checkOutTime: now,
        checkedInBy: session.user.id,
      },
    });
    return NextResponse.json(created);
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOutTime: now },
  });

  return NextResponse.json(updated);
}
