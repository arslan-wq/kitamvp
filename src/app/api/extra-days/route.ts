import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createExtraDaySchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createExtraDaySchema.parse(body);

    // Check if user is parent or staff
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const parent = await prisma.parent.findUnique({ where: { email: session.user.email } });

    if (!user && !parent) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For parents: check they own this child
    if (parent) {
      // Parent access - they can only request for their own children
      const child = await prisma.child.findUnique({
        where: { id: data.childId },
        include: { parents: true },
      });

      if (!child || !child.parents.some(p => p.id === parent.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user) {
      // Staff access - check kitaId
      const child = await prisma.child.findUnique({
        where: { id: data.childId },
      });

      if (!child || child.kitaId !== user.kitaId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const child = await prisma.child.findUnique({ where: { id: data.childId } });
    const extraDay = await prisma.extraDay.create({
      data: {
        ...data,
        kitaId: user?.kitaId || child?.kitaId!,
      },
    });

    return NextResponse.json(extraDay, { status: 201 });
  } catch (error: any) {
    console.error('Error creating extra day:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { kita: true },
    });

    if (!user || !user.kitaId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const extraDays = await prisma.extraDay.findMany({
      where: { kitaId: user.kitaId },
      orderBy: { date: 'asc' },
      take: 100,
    });

    return NextResponse.json(extraDays);
  } catch (error) {
    console.error('Error fetching extra days:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
