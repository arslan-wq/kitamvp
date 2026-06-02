import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createCancellationSchema } from '@/lib/validation';
import { notifyResponsibleStaff } from '@/lib/staffNotify';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createCancellationSchema.parse(body);

    // Check if user is parent or staff
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const parent = await prisma.parent.findUnique({ where: { email: session.user.email } });

    if (!user && !parent) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For parents: check they own this child
    if (parent) {
      const child = await prisma.child.findUnique({
        where: { id: data.childId },
        include: { parents: true },
      });

      if (!child || !child.parents.some(p => p.id === parent.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user) {
      const child = await prisma.child.findUnique({
        where: { id: data.childId },
      });

      if (!child || child.kitaId !== user.kitaId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const child = await prisma.child.findUnique({
      where: { id: data.childId },
    });

    const cancellation = await prisma.cancellation.create({
      data: {
        ...data,
        kitaId: user?.kitaId || child?.kitaId!,
      },
    });

    // Eltern-Abmeldung → zuständiges Personal + Admins benachrichtigen
    if (parent && child) {
      await notifyResponsibleStaff({
        kitaId: child.kitaId,
        child: { firstName: child.firstName, lastName: child.lastName, locationId: child.locationId },
        kind: 'Abmeldung',
        periodLabel: new Date(data.date).toLocaleDateString('de-CH'),
        parentName: `${parent.firstName} ${parent.lastName}`.trim(),
        notes: data.reason,
      });
    }

    return NextResponse.json(cancellation, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cancellation:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.kitaId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cancellations = await prisma.cancellation.findMany({
      where: { kitaId: user.kitaId },
      orderBy: { date: 'asc' },
      take: 100,
    });

    return NextResponse.json(cancellations);
  } catch (error) {
    console.error('Error fetching cancellations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
