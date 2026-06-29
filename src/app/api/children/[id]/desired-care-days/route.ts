import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const PART_KEYS = ['VORMITTAG', 'MITTAGESSEN', 'NACHMITTAG'];

// PATCH /api/children/[id]/desired-care-days — nur ADMIN.
// body.desiredCareDays: { weekday(1-5): string[] }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Admin darf gewünschte Betreuungstage bearbeiten' }, { status: 403 });
  }

  const child = await prisma.child.findFirst({ where: { id: params.id, kitaId: user.kitaId } });
  if (!child) return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const raw = body.desiredCareDays;

  // Normalisieren: nur Wochentage 1–5, nur gültige Tagesteile, leere Tage entfernen
  const clean: Record<number, string[]> = {};
  if (raw && typeof raw === 'object') {
    for (let d = 1; d <= 5; d++) {
      const parts = (raw[d] ?? raw[String(d)]) as unknown;
      if (Array.isArray(parts)) {
        const valid = parts.filter((p) => PART_KEYS.includes(p));
        if (valid.length) clean[d] = valid;
      }
    }
  }

  const updated = await prisma.child.update({
    where: { id: params.id },
    data: { desiredCareDays: Object.keys(clean).length ? clean : undefined } as any,
    select: { id: true, desiredCareDays: true },
  });
  return NextResponse.json(updated);
}
