import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';

const MAX_LEN = 700_000; // ~500 KB Bild als Data-URL

// PUT /api/children/[id]/photo  body: { photoUrl: string | null }
// Profilfoto setzen oder entfernen. NUR Admin oder Eltern des Kindes.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await resolveChildAccess(session.user.email, params.id);
  if (!access.child) return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let photoUrl: string | null;
  try {
    const body = await request.json();
    photoUrl = body?.photoUrl ?? null;
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  // Validierung: entweder null (löschen) oder ein Bild-Data-URL in vernünftiger Größe
  if (photoUrl !== null) {
    if (typeof photoUrl !== 'string' || !photoUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Nur Bilddateien erlaubt' }, { status: 400 });
    }
    if (photoUrl.length > MAX_LEN) {
      return NextResponse.json({ error: 'Bild zu groß (max. ~500 KB)' }, { status: 413 });
    }
  }

  const updated = await prisma.child.update({
    where: { id: params.id },
    data: { photoUrl },
    select: { id: true, photoUrl: true },
  });

  return NextResponse.json(updated);
}
