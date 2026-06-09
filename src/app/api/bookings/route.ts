import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createBookingSchema } from '@/lib/validation';
import { notifyResponsibleStaff } from '@/lib/staffNotify';

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('de-CH');

// POST /api/bookings — Eltern (oder Personal) buchen einen Anwesenheits-Zeitraum
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createBookingSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const parent = await prisma.parent.findUnique({ where: { email: session.user.email } });
    if (!user && !parent) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const child = await prisma.child.findUnique({
      where: { id: data.childId },
      include: { parents: true },
    });
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    // Berechtigung: Eltern nur für eigene Kinder, Personal nur in eigener KiTA
    if (parent && !child.parents.some(p => p.id === parent.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!parent && user && child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Personal (Admin/Leiter/Betreuer) legt Buchungen direkt akzeptiert an;
    // Eltern-Buchungen sind zunächst ausstehend.
    const isStaff = !parent && !!user && user.role !== 'PARENT';

    const booking = await prisma.booking.create({
      data: {
        childId: data.childId,
        kitaId: child.kitaId,
        startDate: data.startDate,
        endDate: data.endDate,
        weekdays: data.weekdays,
        dayType: data.dayType,
        notes: data.notes,
        status: isStaff ? 'APPROVED' : 'PENDING',
        reviewedBy: isStaff ? user!.id : null,
        reviewedAt: isStaff ? new Date() : null,
        createdBy: parent?.id || user?.id || '',
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });

    // Eltern-Anfrage (PENDING) → zuständiges Personal + Admins benachrichtigen
    if (!isStaff && parent) {
      const days = data.weekdays.map((w: number) => WD[w]).join(', ');
      const periodLabel = `${fmtDate(data.startDate)} – ${fmtDate(data.endDate)}${days ? ` · ${days}` : ''}`;
      await notifyResponsibleStaff({
        kitaId: child.kitaId,
        child: { firstName: child.firstName, lastName: child.lastName, locationId: child.locationId },
        kind: 'Betreuungsanfrage',
        periodLabel,
        parentName: `${parent.firstName} ${parent.lastName}`.trim(),
        notes: data.notes,
      });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/bookings — Personal: alle der KiTA; Eltern: eigene Kinder
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const parent = await prisma.parent.findUnique({
      where: { email: session.user.email },
      include: { children: { select: { id: true } } },
    });

    let where: any = {};
    if (user?.kitaId) {
      where = { kitaId: user.kitaId };
    } else if (parent) {
      where = { childId: { in: parent.children.map(c => c.id) } };
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        child: { select: { id: true, firstName: true, lastName: true, locationId: true, photoUrl: true, defaultPickupPerson: true } },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
      take: 300,
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
