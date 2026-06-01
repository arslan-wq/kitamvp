import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// DELETE /api/allergies/[id] — Allergie entfernen (nur Personal der gleichen KiTA)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allergy = await prisma.allergy.findUnique({
    where: { id: params.id },
    include: { child: { select: { kitaId: true } } },
  });
  if (!allergy || allergy.child.kitaId !== session.user.kitaId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.allergy.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
