import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/attendance/[id]/undo  body: { action: 'checkin' | 'checkout' }
// Macht "Abgeholt" (checkout) oder "Anwesend" (checkin) für heute rückgängig.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await request.json().catch(() => ({ action: 'checkout' }));

  const child = await prisma.child.findFirst({
    where: { id: params.id, kitaId: session.user.kitaId },
  });
  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await prisma.attendance.findFirst({
    where: { childId: params.id, date: { gte: today, lt: tomorrow } },
  });
  if (!attendance) {
    return NextResponse.json({ error: 'No attendance for today' }, { status: 404 });
  }

  if (action === 'checkin') {
    // Anwesenheit komplett zurücksetzen (Check-in + Check-out entfernen)
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkInTime: null, checkOutTime: null, checkedInBy: null },
    });
    return NextResponse.json(updated);
  }

  // Standard: nur "Abgeholt" rückgängig → Kind ist wieder anwesend
  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOutTime: null },
  });
  return NextResponse.json(updated);
}
