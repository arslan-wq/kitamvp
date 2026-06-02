import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendActivityEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notify';
import { NextRequest, NextResponse } from 'next/server';

const ACTIVITY_LABELS: Record<string, string> = {
  EATING: 'Essen', DRINKING: 'Trinken', CHANGING_DIAPER: 'Wickeln', SLEEPING: 'Schlafen',
  ACTIVITY: 'Beschäftigung', DISCUSSION: 'Besprechung', NOTE: 'Bemerkung', HEALTH_ISSUE: 'Autsch',
  TRIP: 'Ausflug', ABSENT: 'Abwesend', HOLIDAY: 'Ferien', DRAWING: 'Zeichnen',
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const childId = searchParams.get('childId');
  const dateStr = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const where: any = { kitaId: session.user.kitaId };
  if (childId) where.childId = childId;

  if (dateStr) {
    const date = new Date(dateStr); date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);
    where.timestamp = { gte: date, lt: nextDay };
  } else if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); where.timestamp.gte = s; }
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); where.timestamp.lte = e; }
  }

  const activities = await prisma.activity.findMany({
    where,
    take: 500,
    include: {
      child: {
        select: {
          id: true, firstName: true, lastName: true, photoUrl: true, locationId: true,
          location: { select: { id: true, name: true } },
        },
      },
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
          parents: { select: { id: true, email: true, firstName: true } },
        },
      },
    },
  });

  const childName = `${activity.child.firstName} ${activity.child.lastName}`;
  const activityLabel = ACTIVITY_LABELS[activity.type] || activity.type;

  // Eltern per E-Mail benachrichtigen
  try {
    const timeLabel = new Date(activity.timestamp).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    await Promise.allSettled(
      activity.child.parents.map((p) =>
        sendActivityEmail(p.email, { parentName: p.firstName, childName, activityLabel, timeLabel, details: activity.details })
      )
    );
  } catch (e) {
    console.error('[activity] Eltern-Mail fehlgeschlagen:', e);
  }

  // In-App-Benachrichtigung (Glocke) an die Eltern
  await createNotifications({
    kitaId: session.user.kitaId,
    recipientIds: activity.child.parents.map((p) => p.id),
    type: 'NEW_ACTIVITY',
    title: `Neue Aktivität: ${activityLabel}`,
    message: `${childName} · ${activityLabel}${activity.details ? ` – ${activity.details}` : ''}`,
    link: '/children',
  });

  return NextResponse.json(activity, { status: 201 });
}
