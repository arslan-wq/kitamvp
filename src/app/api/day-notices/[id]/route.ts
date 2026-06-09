import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/day-notices/[id] — Eltern (eigenes Kind) oder Personal
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notice = await prisma.dayNotice.findUnique({ where: { id: params.id } });
  if (!notice) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  const access = await resolveChildAccess(session.user.email, notice.childId);
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.dayNotice.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
