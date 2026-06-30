import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/activities/today-status[?date=YYYY-MM-DD][&locationId=]
// Liefert für die heute erwarteten Kinder, wer noch NICHT gegessen / gewickelt wurde.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const kitaId = session.user.kitaId;

  const sp = request.nextUrl.searchParams;
  const dateStr = sp.get('date');
  const locationId = sp.get('locationId');
  const day = dateStr ? new Date(dateStr) : new Date();
  day.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day); dayEnd.setDate(dayEnd.getDate() + 1);
  const dow = day.getDay();

  const childSel = { id: true, firstName: true, lastName: true, locationId: true };

  const [bookings, extraDays, notices, acts] = await Promise.all([
    prisma.booking.findMany({
      where: { kitaId, status: 'APPROVED', startDate: { lte: day }, endDate: { gte: day } },
      include: { child: { select: childSel } },
    }),
    prisma.extraDay.findMany({
      where: { kitaId, status: 'APPROVED', date: { gte: day, lt: dayEnd } },
      include: { child: { select: childSel } },
    }),
    prisma.dayNotice.findMany({ where: { kitaId, date: { gte: day, lt: dayEnd }, absent: true }, select: { childId: true } }),
    prisma.activity.findMany({
      where: { kitaId, timestamp: { gte: day, lt: dayEnd }, type: { in: ['EATING', 'CHANGING_DIAPER'] } },
      select: { childId: true, type: true },
    }),
  ]);

  // Heute erwartete Kinder (Buchung am Wochentag + bestätigte Zusatztage), abgemeldete raus
  const absent = new Set(notices.map((n) => n.childId));
  const expected = new Map<string, any>();
  for (const b of bookings) {
    if (!b.weekdays.includes(dow)) continue;
    if (absent.has(b.childId)) continue;
    if (!expected.has(b.childId)) expected.set(b.childId, b.child);
  }
  for (const e of extraDays) {
    if (absent.has(e.childId)) continue;
    if (!expected.has(e.childId)) expected.set(e.childId, e.child);
  }

  if (locationId) {
    for (const [id, c] of expected) if ((c.locationId || '') !== locationId) expected.delete(id);
  }

  const ate = new Set(acts.filter((a) => a.type === 'EATING').map((a) => a.childId));
  const changed = new Set(acts.filter((a) => a.type === 'CHANGING_DIAPER').map((a) => a.childId));

  const all = Array.from(expected.values());
  const notEaten = all.filter((c) => !ate.has(c.id));
  const notChanged = all.filter((c) => !changed.has(c.id));

  return NextResponse.json({
    date: day.toISOString().slice(0, 10),
    total: all.length,
    eatenCount: all.length - notEaten.length,
    changedCount: all.length - notChanged.length,
    notEaten,
    notChanged,
    presentIds: all.map((c) => c.id), // T2: heute anwesende/erwartete Kinder
  });
}
