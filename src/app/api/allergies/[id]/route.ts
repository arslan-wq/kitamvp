import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';

// DELETE /api/allergies/[id] — Allergie entfernen (Personal der KiTA ODER Eltern des Kindes)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allergy = await prisma.allergy.findUnique({
    where: { id: params.id },
    select: { id: true, childId: true },
  });
  if (!allergy) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const access = await resolveChildAccess(session.user.email, allergy.childId);
  if (!access.allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.allergy.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
