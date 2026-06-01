import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLocationSchema } from '@/lib/validation';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { location: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const locations = await prisma.location.findMany({
      where: { kitaId: user.kitaId! },
      include: {
        users: true,
        children: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role === 'BETREUER' || user.role === 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = createLocationSchema.parse(body);

    const location = await prisma.location.create({
      data: {
        ...data,
        kitaId: user.kitaId!,
      },
      include: {
        users: true,
        children: true,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    console.error('Error creating location:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Location already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
