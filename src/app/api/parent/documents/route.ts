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

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { where: childId ? { id: childId } : undefined } },
    });

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    if (childId && parent.children.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const childIds = parent.children.map((c) => c.id);

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { childId: null }, // Shared documents
          { childId: { in: childIds } }, // Documents for parent's children
        ],
      },
      include: { child: true },
      orderBy: { uploadedAt: 'desc' },
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
