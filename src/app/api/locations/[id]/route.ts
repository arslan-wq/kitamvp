import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateLocationSchema } from '@/lib/validation';
import { applyStaffAssignments } from '@/lib/locationStaff';

async function getManager(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Nur ADMIN / KITA_LEITER dürfen Standorte verwalten (wie beim Anlegen)
  if (!user || user.role === 'BETREUER' || user.role === 'PARENT') return null;
  return user;
}

// PUT /api/locations/[id] — Standort bearbeiten
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getManager(session.user.email);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const location = await prisma.location.findUnique({ where: { id: params.id } });
    if (!location || location.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { staffAssignments, ...data } = updateLocationSchema.parse(await request.json());

    await prisma.location.update({
      where: { id: params.id },
      data: { ...data, ...(data.email !== undefined ? { email: data.email || null } : {}) },
    });

    if (staffAssignments) {
      await applyStaffAssignments(params.id, user.kitaId!, location.name, staffAssignments);
    }

    const updated = await prisma.location.findUnique({
      where: { id: params.id },
      include: { users: true, children: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating location:', error);
    if (error.name === 'ZodError') return NextResponse.json({ error: error.errors }, { status: 400 });
    if (error.code === 'P2002') return NextResponse.json({ error: 'Name bereits vergeben' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/locations/[id] — Standort löschen (Kinder & Personal werden gelöst, nicht gelöscht)
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getManager(session.user.email);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const location = await prisma.location.findUnique({ where: { id: params.id } });
    if (!location || location.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.child.updateMany({ where: { locationId: params.id }, data: { locationId: null } }),
      prisma.user.updateMany({ where: { locationId: params.id }, data: { locationId: null } }),
      prisma.location.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
