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

  let attendance = await prisma.attendance.findFirst({
    where: {
      childId: params.id,
      date: { gte: today, lt: tomorrow },
    },
  });

  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: {
        childId: params.id,
        date: today,
        checkInTime: new Date(),
        checkedInBy: session.user.id,
      },
    });
  } else {
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkInTime: new Date(),
        checkedInBy: session.user.id,
      },
    });
  }

  return NextResponse.json(attendance);
}
