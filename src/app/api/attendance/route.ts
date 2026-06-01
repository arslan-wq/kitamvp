import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateStr = searchParams.get('date');

  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const attendance = await prisma.attendance.findMany({
    where: {
      date: {
        gte: date,
        lt: endDate,
      },
      child: {
        kitaId: session.user.kitaId,
      },
    },
    include: {
      child: true,
    },
    orderBy: { child: { firstName: 'asc' } },
  });

  return NextResponse.json(attendance);
}
