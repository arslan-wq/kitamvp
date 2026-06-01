import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateBookingStatusSchema } from '@/lib/validation';

// PATCH /api/bookings/[id] — Personal (Admin/Leiter/Betreuer) nimmt an oder lehnt ab
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !user.kitaId || user.role === 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = updateBookingStatusSchema.parse(body);

    const booking = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!booking || booking.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating booking:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bookings/[id] — Eltern stornieren eigene Buchung, Personal jede in der KiTA
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const parent = await prisma.parent.findUnique({
      where: { email: session.user.email },
      include: { children: { select: { id: true } } },
    });

    const booking = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const isStaff = !!user && user.kitaId === booking.kitaId && user.role !== 'PARENT';
    const isOwner = !!parent && parent.children.some(c => c.id === booking.childId);
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
