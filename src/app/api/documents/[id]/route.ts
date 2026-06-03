import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/documents/[id] — nur Personal (Admin/Leitung/Betreuer), mandantengescoped.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Nur Personal darf löschen' }, { status: 403 });
  }
  const doc = await prisma.document.findFirst({ where: { id: params.id, kitaId: session.user.kitaId } });
  if (!doc) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
