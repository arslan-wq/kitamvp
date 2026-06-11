import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { notifyResponsibleStaff } from '@/lib/staffNotify';
import { createExtraDaySchema } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

const dayStart = (s: string | Date) => { const d = new Date(s); d.setHours(0, 0, 0, 0); return d; };
const PART_LABELS: Record<string, string> = { VORMITTAG: 'Vormittag', MITTAGESSEN: 'Mittagessen', NACHMITTAG: 'Nachmittag' };

// POST /api/extra-days — Zusatztag anlegen (Eltern: Anfrage; Personal: bestätigt)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let data;
  try { data = createExtraDaySchema.parse(await request.json()); }
  catch (e: any) { return NextResponse.json({ error: e.errors || 'Ungültige Eingabe' }, { status: 400 }); }

  const access = await resolveChildAccess(session.user.email, data.childId);
  if (!access.child) return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isStaff = access.isStaff && !access.isParent;
  const status = isStaff ? 'APPROVED' : 'REQUESTED';

  const extraDay = await prisma.extraDay.create({
    data: {
      childId: data.childId,
      kitaId: access.child.kitaId,
      date: dayStart(data.date),
      type: data.type || 'FULL_DAY',
      parts: (data.parts && data.parts.length ? data.parts : undefined) as any,
      status,
      notes: data.notes || null,
    },
  });

  // Eltern-Anfrage → zuständiges Personal benachrichtigen
  if (!isStaff && access.isParent) {
    const partsLabel = (data.parts || []).map((p) => PART_LABELS[p] || p).join(' + ');
    await notifyResponsibleStaff({
      kitaId: access.child.kitaId,
      child: { firstName: access.child.firstName, lastName: access.child.lastName, locationId: (access.child as any).locationId ?? null },
      kind: 'Betreuungsanfrage',
      periodLabel: `Zusatztag ${new Date(dayStart(data.date)).toLocaleDateString('de-CH')}${partsLabel ? ` · ${partsLabel}` : ''}`,
      notes: data.notes,
    });
  }

  return NextResponse.json(extraDay, { status: 201 });
}

// GET /api/extra-days?date= / ?month=YYYY-MM / ?status=
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const dateStr = sp.get('date');
  const month = sp.get('month');
  const status = sp.get('status');

  const where: any = {};
  if (dateStr) { const d = dayStart(dateStr); const next = new Date(d); next.setDate(next.getDate() + 1); where.date = { gte: d, lt: next }; }
  else if (month) { const [y, m] = month.split('-').map(Number); const start = new Date(y, m - 1, 1); const end = new Date(y, m, 1); where.date = { gte: start, lt: end }; }
  if (status) where.status = status;

  const staff = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (staff?.kitaId) {
    where.kitaId = staff.kitaId;
  } else {
    const parent = await prisma.parent.findUnique({ where: { email: session.user.email }, include: { children: { select: { id: true } } } });
    if (!parent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    where.childId = { in: parent.children.map((c) => c.id) };
  }

  const extraDays = await prisma.extraDay.findMany({
    where,
    include: { child: { select: { id: true, firstName: true, lastName: true, locationId: true, photoUrl: true } } },
    orderBy: { date: 'asc' },
    take: 500,
  });
  return NextResponse.json(extraDays);
}
