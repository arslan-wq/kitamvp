import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const MAX_LEN = 700_000; // ~500 KB Bild als Data-URL

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Unauthorized', status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || !['ADMIN', 'KITA_LEITER'].includes(user.role)) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { user };
}

function validatePhoto(photoUrl: any): string | null | undefined | { error: string; status: number } {
  if (photoUrl === undefined) return undefined;
  if (photoUrl === null) return null;
  if (typeof photoUrl !== 'string' || !photoUrl.startsWith('data:image/')) {
    return { error: 'Nur Bilddateien erlaubt', status: 400 };
  }
  if (photoUrl.length > MAX_LEN) return { error: 'Bild zu groß (max. ~500 KB)', status: 413 };
  return photoUrl;
}

// PATCH /api/users/[id] — Personal oder Eltern bearbeiten (NICHT Passwort).
// body.type: 'staff' | 'parent'. Mandantengescoped.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const manager = auth.user;
  const kitaId = manager.kitaId!;

  const body = await request.json().catch(() => ({}));

  const photo = validatePhoto(body.photoUrl);
  if (photo && typeof photo === 'object') return NextResponse.json({ error: photo.error }, { status: photo.status });

  if (body.type === 'parent') {
    // Eltern müssen ein Kind in dieser KiTA haben (Mandantenschutz)
    const parent = await prisma.parent.findFirst({
      where: { id: params.id, children: { some: { kitaId } } },
    });
    if (!parent) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

    const data: any = {};
    if (typeof body.firstName === 'string' && body.firstName.trim()) data.firstName = body.firstName.trim();
    if (typeof body.lastName === 'string' && body.lastName.trim()) data.lastName = body.lastName.trim();
    if (typeof body.email === 'string' && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (typeof body.phone === 'string') data.phone = body.phone;
    if (photo !== undefined) data.photoUrl = photo;

    try {
      const updated = await prisma.parent.update({
        where: { id: params.id }, data,
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, photoUrl: true },
      });
      return NextResponse.json(updated);
    } catch (e: any) {
      if (e.code === 'P2002') return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 409 });
      throw e;
    }
  }

  // Personal (staff)
  const target = await prisma.user.findFirst({ where: { id: params.id, kitaId } });
  if (!target) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.email === 'string' && body.email.trim()) data.email = body.email.trim().toLowerCase();
  if (body.locationId !== undefined) data.locationId = body.locationId || null;
  if (photo !== undefined) data.photoUrl = photo;
  // Rolle nur ADMIN darf ändern; ADMIN-Rolle nur durch ADMIN vergebbar
  if (typeof body.role === 'string' && ['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(body.role)) {
    if (manager.role === 'ADMIN') data.role = body.role;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id }, data,
      select: { id: true, email: true, name: true, role: true, locationId: true, photoUrl: true },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 409 });
    throw e;
  }
}
