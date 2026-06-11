import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLocationSchema } from '@/lib/validation';
import { applyStaffAssignments } from '@/lib/locationStaff';

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
        // Perf + Datenschutz: kein Passwort-Hash/Foto im Personal-Objekt;
        // Kinder nur mit den auf der Standort-Seite genutzten Feldern.
        users: { select: { id: true, name: true, email: true, role: true, workingHours: true, locationId: true } },
        children: { select: { id: true, firstName: true, lastName: true, photoUrl: true, locationId: true } },
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
    const { staffAssignments, ...data } = createLocationSchema.parse(body);

    const location = await prisma.location.create({
      data: {
        ...data,
        email: data.email || null,
        kitaId: user.kitaId!,
      },
    });

    if (staffAssignments && staffAssignments.length) {
      await applyStaffAssignments(location.id, user.kitaId!, location.name, staffAssignments);
    }

    const withRelations = await prisma.location.findUnique({
      where: { id: location.id },
      include: { users: true, children: true },
    });

    return NextResponse.json(withRelations, { status: 201 });
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
