import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const MAX_LEN = 3_500_000; // ~2.5 MB Bild/Datei als Data-URL

// GET /api/documents — Personal: alle der KiTA; Eltern: eigene Kinder + allgemeine.
// Filter: childId, kind ('photo'|'document'), startDate, endDate.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const childId = sp.get('childId');
  const kind = sp.get('kind');
  const startDate = sp.get('startDate');
  const endDate = sp.get('endDate');

  const dateFilter: any = {};
  if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); dateFilter.gte = s; }
  if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); dateFilter.lte = e; }

  const staff = await prisma.user.findUnique({ where: { email } });
  const parent = !staff ? await prisma.parent.findUnique({
    where: { email },
    include: { children: { select: { id: true, photoConsent: true } } },
  }) : null;

  try {
    if (staff?.kitaId) {
      const where: any = { kitaId: staff.kitaId };
      if (childId) where.childId = childId; else if (childId === '') where.childId = null;
      if (kind) where.kind = kind;
      if (Object.keys(dateFilter).length) where.uploadedAt = dateFilter;
      const documents = await prisma.document.findMany({ where, orderBy: { uploadedAt: 'desc' }, take: 200 });
      return NextResponse.json(documents);
    }

    if (parent) {
      const consentedIds = parent.children.filter((c) => c.photoConsent).map((c) => c.id);
      const ownIds = parent.children.map((c) => c.id);
      // Eltern sehen: allgemeine Dokumente + eigene Kind-Dokumente;
      // Fotos NUR bei erteilter Einwilligung.
      const where: any = {
        OR: [
          { kind: 'document', OR: [{ childId: null }, { childId: { in: ownIds } }] },
          { kind: 'photo', childId: { in: consentedIds } },
        ],
      };
      if (kind === 'document') where.OR = [{ kind: 'document', AND: [{ OR: [{ childId: null }, { childId: { in: ownIds } }] }] }];
      if (kind === 'photo') where.OR = [{ kind: 'photo', childId: { in: consentedIds } }];
      if (childId) where.childId = childId;
      if (Object.keys(dateFilter).length) where.uploadedAt = dateFilter;
      const documents = await prisma.document.findMany({ where, orderBy: { uploadedAt: 'desc' }, take: 200 });
      return NextResponse.json(documents);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('[Documents GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST /api/documents — nur Personal (Admin/Leitung/Betreuer). Fotos nur bei Einwilligung.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Nur Personal darf hochladen' }, { status: 403 });
  }
  if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Nur Personal darf hochladen' }, { status: 403 });
  }

  try {
    const { childId, fileName, storageUrl, kind } = await request.json();
    if (!fileName || !storageUrl) {
      return NextResponse.json({ error: 'fileName und Datei erforderlich' }, { status: 400 });
    }
    if (typeof storageUrl !== 'string' || !storageUrl.startsWith('data:')) {
      return NextResponse.json({ error: 'Ungültige Datei (Data-URL erwartet)' }, { status: 400 });
    }
    if (storageUrl.length > MAX_LEN) {
      return NextResponse.json({ error: 'Datei zu groß (max. ~2.5 MB)' }, { status: 413 });
    }

    const docKind = kind === 'document' ? 'document' : 'photo';

    // Foto-Einwilligung prüfen (revDSG): Fotos eines Kindes nur mit Zustimmung
    if (docKind === 'photo' && childId) {
      const child = await prisma.child.findFirst({
        where: { id: childId, kitaId: session.user.kitaId },
        select: { photoConsent: true, firstName: true, lastName: true },
      });
      if (!child) return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
      if (!child.photoConsent) {
        return NextResponse.json({
          error: `Für ${child.firstName} ${child.lastName} liegt keine Foto-Einwilligung der Eltern vor. Es dürfen keine Bilder hochgeladen werden.`,
          code: 'NO_CONSENT',
        }, { status: 409 });
      }
    }

    const document = await prisma.document.create({
      data: {
        kitaId: session.user.kitaId,
        childId: childId || null,
        fileName,
        storageUrl,
        kind: docKind,
        uploadedBy: session.user.id,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('[Documents POST] Error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}
