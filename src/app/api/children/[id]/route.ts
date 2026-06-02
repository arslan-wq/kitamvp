import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';

export async function GET(
  __request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vollständiges Dossier laden
    const child = await prisma.child.findUnique({
      where: { id: params.id },
      include: {
        parents: true,
        location: true,
        allergies: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        medicalRecord: {
          include: {
            vaccinations: { orderBy: { vaccinationDate: 'desc' } },
            healthHistory: { orderBy: { date: 'desc' } },
          },
        },
        documents: { orderBy: { uploadedAt: 'desc' } },
        contracts: { orderBy: { startDate: 'desc' } },
      },
    });

    if (!child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Zugriff: Personal der gleichen KiTA ODER Elternteil des Kindes
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const isStaff = !!user && user.kitaId === child.kitaId;
    const isParent = child.parents.some(p => p.email === session.user!.email);

    if (!isStaff && !isParent) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(child);
  } catch (error) {
    console.error('Get child error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Zugriff: Personal der KiTA ODER Eltern des Kindes
    const access = await resolveChildAccess(session.user.email, params.id);
    if (!access.allowed || !access.child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const child = access.child;

    const { firstName, lastName, birthDate, locationId } = await request.json();

    const updated = await prisma.child.update({
      where: { id: params.id },
      data: {
        firstName: firstName || child.firstName,
        lastName: lastName || child.lastName,
        birthDate: birthDate ? new Date(birthDate) : child.birthDate,
        // Standort darf nur Personal ändern; Eltern-Änderungen werden ignoriert
        ...(access.isStaff
          ? { locationId: locationId === undefined ? child.locationId : locationId || null }
          : {}),
      },
      include: { parents: true, allergies: true, location: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update child error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  __request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and kita_leiter can delete children, not betreuer or parents
    const userRole = (session.user as any).role;
    if (!['ADMIN', 'KITA_LEITER'].includes(userRole)) {
      return NextResponse.json({ error: 'Only administrators can delete children' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { kita: true },
    });

    if (!user?.kitaId) {
      return NextResponse.json({ error: 'No KiTA assigned' }, { status: 400 });
    }

    const child = await prisma.child.findUnique({
      where: { id: params.id },
    });

    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.child.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete child error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
