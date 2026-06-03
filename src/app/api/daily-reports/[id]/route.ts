import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Personal (Admin/Leitung/Betreuer) darf Tagesberichte bearbeiten/löschen.
async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Unauthorized', status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { user };
}

// PATCH /api/daily-reports/[id] — Bericht bearbeiten
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const kitaId = auth.user.kitaId!;

  const existing = await prisma.dailyReport.findFirst({ where: { id: params.id, kitaId } });
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const data: any = {};
  if (body.date !== undefined) data.date = new Date(body.date);
  if (Array.isArray(body.meals)) data.meals = body.meals.map((m: any) => JSON.stringify(m));
  if (Array.isArray(body.activities)) data.activities = body.activities.map((a: any) => JSON.stringify(a));
  if (Array.isArray(body.incidents)) data.incidents = body.incidents.map((i: any) => JSON.stringify(i));
  if (body.mood !== undefined) data.mood = body.mood;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.sleepTime !== undefined) data.sleepTime = body.sleepTime;
  if (body.sleepDuration !== undefined) data.sleepDuration = body.sleepDuration;
  if (body.toiletVisits !== undefined) data.toiletVisits = body.toiletVisits ?? 0;
  if (body.diaperChanges !== undefined) data.diaperChanges = body.diaperChanges ?? 0;
  if (body.extraBottles !== undefined) data.extraBottles = body.extraBottles ?? 0;
  if (body.extraBottleNotes !== undefined) data.extraBottleNotes = body.extraBottleNotes;

  const updated = await prisma.dailyReport.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/daily-reports/[id] — Bericht löschen
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const kitaId = auth.user.kitaId!;

  const existing = await prisma.dailyReport.findFirst({ where: { id: params.id, kitaId } });
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  await prisma.dailyReport.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
