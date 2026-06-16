import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

const STAFF_ROLES = ['ADMIN', 'KITA_LEITER', 'BETREUER'];

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: 'Unauthorized', status: 401 as const };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !user.kitaId || !['ADMIN', 'KITA_LEITER'].includes(user.role)) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { user };
}

// Reset-/Set-Passwort-Mail erzeugen und senden
async function sendSetPasswordMail(kind: 'user' | 'parent', id: string, email: string, name: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h beim Anlegen
  if (kind === 'user') {
    await prisma.user.update({ where: { id }, data: { resetToken: token, resetTokenExpiry: expiry } });
  } else {
    await prisma.parent.update({ where: { id }, data: { resetToken: token, resetTokenExpiry: expiry } });
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  await sendPasswordResetEmail(email, `${base}/auth/reset-password?token=${token}`, name).catch((e) =>
    console.error('[users] Set-Passwort-Mail fehlgeschlagen:', e)
  );
}

// GET /api/users — Personal + Eltern der KiTA
export async function GET() {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const kitaId = auth.user.kitaId!;
  const [staff, parents] = await Promise.all([
    prisma.user.findMany({
      where: { kitaId },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.parent.findMany({
      where: { children: { some: { kitaId } } },
      include: { children: { where: { kitaId }, select: { firstName: true, lastName: true } } },
      orderBy: { firstName: 'asc' },
    }),
  ]);

  return NextResponse.json({
    staff: staff.map((u) => ({
      id: u.id, email: u.email, name: u.name, role: u.role, photoUrl: u.photoUrl,
      locationId: u.locationId, location: u.location, createdAt: u.createdAt,
    })),
    parents: parents.map((p) => ({
      id: p.id, email: p.email, firstName: p.firstName, lastName: p.lastName, phone: p.phone,
      photoUrl: p.photoUrl, archivedAt: p.archivedAt, children: p.children, createdAt: p.createdAt,
    })),
  });
}

// POST /api/users — Personal oder Eltern anlegen + Set-Passwort-Mail
export async function POST(request: Request) {
  const auth = await requireManager();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const manager = auth.user;

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 }); }
  const type = body.type;
  const email = (body.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 });

  // E-Mail darf nicht doppelt sein (weder User noch Parent)
  const [eu, ep] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.parent.findUnique({ where: { email } }),
  ]);
  if (eu || ep) return NextResponse.json({ error: 'E-Mail wird bereits verwendet' }, { status: 409 });

  const tempPw = await bcrypt.hash(crypto.randomBytes(12).toString('hex'), 10);

  // Profilfoto ist optional. Wenn eines mitgegeben wird, Format/Größe prüfen.
  const photoUrl = body.photoUrl || null;
  if (photoUrl !== null) {
    if (typeof photoUrl !== 'string' || !photoUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Nur Bilddateien erlaubt' }, { status: 400 });
    }
    if (photoUrl.length > 700_000) {
      return NextResponse.json({ error: 'Bild zu groß (max. ~500 KB)' }, { status: 413 });
    }
  }

  if (type === 'staff') {
    const { name, role, locationId } = body;
    if (!name || !role) return NextResponse.json({ error: 'Name und Rolle erforderlich' }, { status: 400 });
    if (!STAFF_ROLES.includes(role)) return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 });
    // Nur ADMIN darf ADMIN anlegen
    if (role === 'ADMIN' && manager.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nur Admins dürfen Admins anlegen' }, { status: 403 });
    }
    const created = await prisma.user.create({
      data: {
        email, name, role, password: tempPw,
        kitaId: manager.kitaId,
        locationId: locationId || null,
        photoUrl,
      },
    });
    await sendSetPasswordMail('user', created.id, email, name);
    return NextResponse.json({ id: created.id, email, name, role }, { status: 201 });
  }

  if (type === 'parent') {
    const { firstName, lastName, phone } = body;
    if (!firstName || !lastName) return NextResponse.json({ error: 'Vor- und Nachname erforderlich' }, { status: 400 });
    const created = await prisma.parent.create({
      data: { email, firstName, lastName, phone: phone || '', password: tempPw, photoUrl },
    });
    await sendSetPasswordMail('parent', created.id, email, `${firstName} ${lastName}`);
    return NextResponse.json({ id: created.id, email, firstName, lastName }, { status: 201 });
  }

  return NextResponse.json({ error: "type muss 'staff' oder 'parent' sein" }, { status: 400 });
}
