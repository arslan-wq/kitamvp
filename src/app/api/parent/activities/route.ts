import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/parent/activities?childId=  — Aktivitäten eines eigenen Kindes (eltern-tauglich)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const childId = request.nextUrl.searchParams.get('childId');
  if (!childId) {
    return NextResponse.json({ error: 'childId erforderlich' }, { status: 400 });
  }

  const parent = await prisma.parent.findUnique({
    where: { email: session.user.email },
    include: { children: { select: { id: true } } },
  });
  if (!parent || !parent.children.some(c => c.id === childId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const activities = await prisma.activity.findMany({
    where: { childId },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  return NextResponse.json(activities);
}
