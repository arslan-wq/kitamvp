import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const childId = searchParams.get('childId');

  try {
    const documents = await prisma.document.findMany({
      where: {
        kitaId: session.user.kitaId,
        ...(childId ? { childId } : { childId: null }),
      },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('[Documents GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { childId, fileName, storageUrl } = body;

    if (!fileName || !storageUrl) {
      return NextResponse.json({ error: 'fileName and storageUrl required' }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        kitaId: session.user.kitaId,
        childId: childId || null,
        fileName,
        storageUrl,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('[Documents POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
