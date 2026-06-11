import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const MAX_LEN = 700_000; // ~500 KB Bild als Data-URL

function isParent(session: any) {
  return (session?.user as any)?.type === 'parent';
}

// GET /api/me — eigenes Profil (Personal oder Eltern)
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isParent(session)) {
    const p = await prisma.parent.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, photoUrl: true, emailNotifications: true },
    });
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...p, name: `${p.firstName} ${p.lastName}`, type: 'parent' });
  }

  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, photoUrl: true, workingHours: true },
  });
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...u, type: 'staff' });
}

// PATCH /api/me — eigenes Profil aktualisieren (Name/Telefon/Foto). NICHT Passwort, NICHT Rolle.
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id;
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  // Foto validieren (wenn vorhanden)
  if (body.photoUrl !== undefined && body.photoUrl !== null) {
    if (typeof body.photoUrl !== 'string' || !body.photoUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Nur Bilddateien erlaubt' }, { status: 400 });
    }
    if (body.photoUrl.length > MAX_LEN) {
      return NextResponse.json({ error: 'Bild zu groß (max. ~500 KB)' }, { status: 413 });
    }
  }

  if (isParent(session)) {
    const data: any = {};
    if (typeof body.firstName === 'string' && body.firstName.trim()) data.firstName = body.firstName.trim();
    if (typeof body.lastName === 'string' && body.lastName.trim()) data.lastName = body.lastName.trim();
    if (typeof body.phone === 'string') data.phone = body.phone;
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl;
    if (typeof body.emailNotifications === 'boolean') data.emailNotifications = body.emailNotifications; // T4
    const p = await prisma.parent.update({
      where: { id },
      data,
      select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true, emailNotifications: true },
    });
    return NextResponse.json({ ...p, name: `${p.firstName} ${p.lastName}`, type: 'parent' });
  }

  const data: any = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl;
  const u = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, photoUrl: true },
  });
  return NextResponse.json({ ...u, type: 'staff' });
}
