import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { notifyResponsibleStaff } from '@/lib/staffNotify';
import { NextRequest, NextResponse } from 'next/server';

const dayStart = (s: string | Date) => { const d = new Date(s); d.setHours(0, 0, 0, 0); return d; };

// GET /api/day-notices?date=YYYY-MM-DD  (Personal: KiTA; Eltern: eigene Kinder)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const dateStr = sp.get('date');
  const where: any = {};
  if (dateStr) { const d = dayStart(dateStr); const next = new Date(d); next.setDate(next.getDate() + 1); where.date = { gte: d, lt: next }; }

  const staff = await prisma.user.findUnique({ where: { email } });
  if (staff?.kitaId) {
    where.kitaId = staff.kitaId;
  } else {
    const parent = await prisma.parent.findUnique({ where: { email }, include: { children: { select: { id: true } } } });
    if (!parent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    where.childId = { in: parent.children.map((c) => c.id) };
  }

  const notices = await prisma.dayNotice.findMany({
    where,
    include: { child: { select: { id: true, firstName: true, lastName: true, locationId: true, defaultPickupPerson: true } } },
    orderBy: { date: 'desc' },
    take: 300,
  });
  return NextResponse.json(notices);
}

// POST /api/day-notices — anlegen/aktualisieren (Upsert je Kind & Tag)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { childId, date, absent, reason, earlyPickup, pickupTime, pickupPerson, saveAsDefault } = body;
  if (!childId || !date) return NextResponse.json({ error: 'childId und date erforderlich' }, { status: 400 });

  const access = await resolveChildAccess(session.user.email, childId);
  if (!access.child) return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const d = dayStart(date);
  const data = {
    absent: !!absent,
    reason: reason || null,
    earlyPickup: !!earlyPickup,
    pickupTime: pickupTime || null,
    pickupPerson: pickupPerson || null,
  };

  const notice = await prisma.dayNotice.upsert({
    where: { childId_date: { childId, date: d } },
    create: { childId, kitaId: access.child.kitaId, date: d, createdBy: (session.user as any).id, ...data },
    update: data,
  });

  // Standard-Abholperson speichern (T10)
  if (saveAsDefault && pickupPerson) {
    await prisma.child.update({ where: { id: childId }, data: { defaultPickupPerson: pickupPerson } });
  }

  // Eltern-Meldung → zuständiges Personal benachrichtigen
  if (access.isParent && !access.isStaff) {
    const parts: string[] = [];
    if (data.absent) parts.push(`abwesend${data.reason ? ` (${data.reason})` : ''}`);
    if (data.earlyPickup) parts.push(`früher abholen${data.pickupTime ? ` um ${data.pickupTime}` : ''}`);
    if (data.pickupPerson) parts.push(`Abholung: ${data.pickupPerson}`);
    if (parts.length) {
      await notifyResponsibleStaff({
        kitaId: access.child.kitaId,
        child: { firstName: access.child.firstName, lastName: access.child.lastName, locationId: (access.child as any).locationId ?? null },
        kind: data.absent ? 'Abmeldung' : 'Betreuungsanfrage',
        periodLabel: `${new Date(d).toLocaleDateString('de-CH')} · ${parts.join(' · ')}`,
        notes: data.reason,
      });
    }
  }

  return NextResponse.json(notice, { status: 201 });
}
