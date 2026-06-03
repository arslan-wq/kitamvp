import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/children/[id]/photo-consent  body: { consent: boolean }
// Foto-Einwilligung (revDSG) — nur Eltern des Kindes oder Admin.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await resolveChildAccess(session.user.email, params.id);
  if (!access.child) return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
  if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const consent = !!body.consent;
  const updated = await prisma.child.update({
    where: { id: params.id },
    data: { photoConsent: consent },
    select: { id: true, photoConsent: true },
  });
  return NextResponse.json(updated);
}
