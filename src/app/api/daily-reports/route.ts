import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendDailyReportEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notify';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const childId = searchParams.get('childId');
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Check if user is parent or staff
  const isParent = await prisma.parent.findUnique({
    where: { email: session.user.email },
  });

  const isStaff = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!isParent && !isStaff) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Build where clause — immer mandantengescoped
  const where: any = {};

  if (isStaff?.kitaId) {
    where.kitaId = isStaff.kitaId;
  } else if (isParent) {
    // Eltern: nur Berichte ihrer eigenen Kinder
    const parent = await prisma.parent.findUnique({
      where: { email: session.user.email },
      include: { children: { select: { id: true } } },
    });
    const ids = parent?.children.map(c => c.id) || [];
    where.childId = { in: ids };
  } else {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Optionaler Kind-Filter (für Eltern zusätzlich Eigentumsprüfung)
  if (childId) {
    if (isParent && !isStaff) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: { parents: { select: { email: true } } },
      });
      if (!child?.parents.some(p => p.email === session.user!.email)) {
        return NextResponse.json({ error: 'Access denied to this child' }, { status: 403 });
      }
    }
    where.childId = childId;
  }

  // Datumsfilter
  if (date) {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); where.date.gte = s; }
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); where.date.lte = e; }
  }

  try {
    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 500,
      include: {
        child: {
          select: {
            id: true, firstName: true, lastName: true, photoUrl: true, locationId: true,
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const {
      childId,
      date,
      meals,
      extraBottles,
      extraBottleNotes,
      sleepTime,
      sleepDuration,
      toiletVisits,
      diaperChanges,
      activities,
      mood,
      incidents,
      medications,
      notes,
    } = await request.json();

    if (!childId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: childId, date' },
        { status: 400 }
      );
    }

    // Verify child belongs to same KiTA
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child || child.kitaId !== session.user.kitaId) {
      return NextResponse.json({ error: 'Child not found or access denied' }, { status: 403 });
    }

    // Check if report exists for this date
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await prisma.dailyReport.findFirst({
      where: {
        childId,
        date: {
          gte: reportDate,
          lt: nextDay,
        },
      },
    });

    if (existing) {
      // Update existing report
      const updated = await prisma.dailyReport.update({
        where: { id: existing.id },
        data: {
          meals: Array.isArray(meals) ? meals.map((m: any) => JSON.stringify(m)) : undefined,
          extraBottles: extraBottles ?? 0,
          extraBottleNotes,
          sleepTime,
          sleepDuration,
          toiletVisits: toiletVisits ?? 0,
          diaperChanges: diaperChanges ?? 0,
          activities: Array.isArray(activities) ? activities.map((a: any) => JSON.stringify(a)) : undefined,
          mood,
          incidents: Array.isArray(incidents) ? incidents.map((i: any) => JSON.stringify(i)) : undefined,
          medications: medications ?? [],
          notes,
        },
      });

      return NextResponse.json(updated, { status: 200 });
    }

    // Create new report
    const report = await prisma.dailyReport.create({
      data: {
        childId,
        kitaId: session.user.kitaId,
        date: reportDate,
        createdBy: session.user.id,
        meals: Array.isArray(meals) ? meals.map((m: any) => JSON.stringify(m)) : [],
        extraBottles: extraBottles ?? 0,
        extraBottleNotes,
        sleepTime,
        sleepDuration,
        toiletVisits: toiletVisits ?? 0,
        diaperChanges: diaperChanges ?? 0,
        activities: Array.isArray(activities) ? activities.map((a: any) => JSON.stringify(a)) : [],
        mood,
        incidents: Array.isArray(incidents) ? incidents.map((i: any) => JSON.stringify(i)) : [],
        medications: medications ?? [],
        notes,
      },
    });

    // Eltern per E-Mail benachrichtigen
    try {
      const c = await prisma.child.findUnique({
        where: { id: childId },
        include: { parents: { select: { id: true, email: true, firstName: true } } },
      });
      if (c) {
        const dateLabel = reportDate.toLocaleDateString('de-CH');
        const childName = `${c.firstName} ${c.lastName}`;
        await Promise.allSettled(
          c.parents.map((p) =>
            sendDailyReportEmail(p.email, { parentName: p.firstName, childName, dateLabel })
          )
        );
        // In-App-Benachrichtigung (Glocke) an die Eltern
        await createNotifications({
          kitaId: session.user.kitaId,
          recipientIds: c.parents.map((p) => p.id),
          type: 'NEW_REPORT',
          title: `Neuer Tagesbericht – ${childName}`,
          message: `Tagesbericht vom ${dateLabel} ist verfügbar.`,
          link: '/daily-reports',
        });
      }
    } catch (e) {
      console.error('[daily-report] Eltern-Mail fehlgeschlagen:', e);
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating daily report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
