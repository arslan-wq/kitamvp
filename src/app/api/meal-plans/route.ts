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
  const weekStart = searchParams.get('weekStart');

  let where: any = { kitaId: session.user.kitaId };

  // If a specific week is requested, get that week's meal plan
  if (weekStart) {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    where.weekStart = {
      gte: start,
      lt: end,
    };
  } else {
    // Default: get current and future meal plans
    const now = new Date();
    const mondayThisWeek = new Date(now);
    const day = mondayThisWeek.getDay();
    const diff = mondayThisWeek.getDate() - day + (day === 0 ? -6 : 1);
    mondayThisWeek.setDate(diff);
    mondayThisWeek.setHours(0, 0, 0, 0);

    where.weekStart = {
      gte: mondayThisWeek,
    };
  }

  const mealPlans = await prisma.mealPlan.findMany({
    where,
    orderBy: { weekStart: 'desc' },
    include: {
      kita: { select: { name: true } },
    },
  });

  return NextResponse.json(mealPlans);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Only ADMIN and KITA_LEITER can upload meal plans
  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { weekStart, weekEnd, meals, allergenInfo, fileName } = await request.json();

  if (!weekStart || !weekEnd || !meals) {
    return NextResponse.json(
      { error: 'Missing required fields: weekStart, weekEnd, meals' },
      { status: 400 }
    );
  }

  try {
    // Check if meal plan already exists for this week
    const existing = await prisma.mealPlan.findFirst({
      where: {
        kitaId: session.user.kitaId,
        weekStart: new Date(weekStart),
      },
    });

    if (existing) {
      // Update existing meal plan
      const updated = await prisma.mealPlan.update({
        where: { id: existing.id },
        data: {
          weekEnd: new Date(weekEnd),
          meals: JSON.stringify(meals),
          allergenInfo: allergenInfo ? JSON.stringify(allergenInfo) : null,
          fileName,
          uploadedBy: session.user.id,
        },
      });

      return NextResponse.json(updated, { status: 200 });
    }

    // Create new meal plan
    const mealPlan = await prisma.mealPlan.create({
      data: {
        kitaId: session.user.kitaId,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        meals: JSON.stringify(meals),
        allergenInfo: allergenInfo ? JSON.stringify(allergenInfo) : null,
        fileName,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(mealPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
