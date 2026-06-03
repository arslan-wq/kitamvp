import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/meal-plans/[id] — nur Admin/Leitung, mandantengescoped.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const plan = await prisma.mealPlan.findFirst({ where: { id: params.id, kitaId: session.user.kitaId } });
  if (!plan) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  await prisma.mealPlan.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
