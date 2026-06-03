import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).type !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sp = new URL(request.url).searchParams;
    const childId = sp.get('childId');
    const kind = sp.get('kind'); // 'photo' | 'document'
    const startDate = sp.get('startDate');
    const endDate = sp.get('endDate');

    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { select: { id: true, photoConsent: true } } },
    });
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });

    const ownIds = parent.children.map((c) => c.id);
    const consentedIds = parent.children.filter((c) => c.photoConsent).map((c) => c.id);

    // Zugriffsschutz: angefragtes Kind muss dem Elternteil gehören
    if (childId && !ownIds.includes(childId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Dokumente (allgemein + eigene Kinder) immer; Fotos nur mit Einwilligung
    const docScopeIds = childId ? [childId] : ownIds;
    const photoScopeIds = childId ? (consentedIds.includes(childId) ? [childId] : []) : consentedIds;

    const or: any[] = [];
    if (kind !== 'photo') {
      or.push({ kind: 'document', OR: [{ childId: null }, { childId: { in: docScopeIds } }] });
    }
    if (kind !== 'document') {
      or.push({ kind: 'photo', childId: { in: photoScopeIds } });
    }

    const where: any = { OR: or.length ? or : [{ id: '__none__' }] };
    if (startDate || endDate) {
      where.uploadedAt = {};
      if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); where.uploadedAt.gte = s; }
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); where.uploadedAt.lte = e; }
    }

    const documents = await prisma.document.findMany({
      where,
      include: { child: { select: { firstName: true, lastName: true } } },
      orderBy: { uploadedAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Get parent documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
