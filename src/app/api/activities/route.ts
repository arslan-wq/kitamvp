import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const childId = searchParams.get('childId');
  const dateStr = searchParams.get('date');

  // If a specific date is provided, filter to that day
  let where: any = { kitaId: session.user.kitaId };

  if (childId) {
    where.childId = childId;
  }

  if (dateStr) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    where.timestamp = {
      gte: date,
      lt: nextDay,
    };
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      child: true,
    },
    orderBy: { timestamp: 'desc' },
  });

  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { childId, type, timestamp, details, notes, photoUrl } = await request.json();

  if (!childId || !type || !timestamp) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify child belongs to the same KiTA
  const child = await prisma.child.findFirst({
    where: { id: childId, kitaId: session.user.kitaId },
  });

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const activity = await prisma.activity.create({
    data: {
      childId,
      kitaId: session.user.kitaId,
      type,
      timestamp: new Date(timestamp),
      details,
      notes,
      photoUrl,
      createdBy: session.user.id,
    },
    include: {
      child: {
        include: {
          parents: true,
        },
      },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
