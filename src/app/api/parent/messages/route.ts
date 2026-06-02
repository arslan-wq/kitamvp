import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Eltern-Endpunkt: Konversation des eigenen Kindes (über MessageThread je Kind).

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).type !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const childId = new URL(request.url).searchParams.get('childId');
    if (!childId) return NextResponse.json({ error: 'Child ID required' }, { status: 400 });

    // Eigentum prüfen
    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { where: { id: childId }, select: { id: true, kitaId: true } } },
    });
    if (!parent || parent.children.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const child = parent.children[0];
    const thread = await prisma.messageThread.findFirst({
      where: { kitaId: child.kitaId, childId },
    });
    if (!thread) return NextResponse.json([]);

    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get parent messages error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).type !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { childId, content } = await request.json();
    if (!childId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { where: { id: childId }, select: { id: true, kitaId: true } } },
    });
    if (!parent || parent.children.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const child = parent.children[0];
    const name = `${parent.firstName} ${parent.lastName}`.trim();

    // Thread je Kind finden oder anlegen
    let thread = await prisma.messageThread.findFirst({
      where: { kitaId: child.kitaId, childId },
    });
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          kitaId: child.kitaId,
          childId,
          startedBy: parent.id,
          startedByName: name,
          startedByRole: 'PARENT',
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: parent.id,
        senderName: name,
        senderEmail: parent.email,
        senderRole: 'PARENT',
        content,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Post parent message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
