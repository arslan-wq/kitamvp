import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createDailyReportSchema } from '@/lib/validation';

export async function GET(
  __request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const child = await prisma.child.findUnique({ where: { id: params.id } });
    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reports = await prisma.dailyReport.findMany({
      where: { childId: params.id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role === 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = createDailyReportSchema.parse({
      childId: params.id,
      ...body,
    });

    const child = await prisma.child.findUnique({ where: { id: params.id } });
    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const report = await prisma.dailyReport.create({
      data: {
        ...data,
        kitaId: user.kitaId,
        createdBy: user.id,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error('Error creating daily report:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
