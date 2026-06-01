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
    const messages = await prisma.message.findMany({
      where: childId ? { childId } : {},
      include: { child: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('[Messages GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { childId, content, attachments } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        childId,
        senderId: session.user.id,
        senderName: session.user.name || 'Unknown',
        senderEmail: session.user.email || '',
        content,
        attachments: attachments || [],
      },
      include: { child: true },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('[Messages POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
