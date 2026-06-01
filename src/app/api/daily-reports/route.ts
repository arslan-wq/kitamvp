import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

  // Build where clause
  let where: any = {};

  if (childId) {
    where.childId = childId;

    // For parents, verify they have access to this child
    if (isParent) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        include: { parents: true },
      });

      const hasAccess = child?.parents.some(p => p.email === session.user.email);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this child' }, { status: 403 });
      }
    }

    // Filter by date range if specified
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      where.date = {
        gte: d,
        lt: nextDay,
      };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.date = {
        gte: start,
        lte: end,
      };
    } else {
      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      where.date = {
        gte: thirtyDaysAgo,
      };
    }
  }

  try {
    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        child: { select: { firstName: true, lastName: true } },
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

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating daily report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
