import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifyParentsOfNewMessage } from '@/lib/notifyMessage';
import { NextRequest, NextResponse } from 'next/server';

// Nachrichten laufen über einen MessageThread je Kind.
// Personal-Endpunkt: Konversation eines Kindes lesen/schreiben.

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const childId = request.nextUrl.searchParams.get('childId');
  if (!childId) return NextResponse.json([]);

  try {
    const thread = await prisma.messageThread.findFirst({
      where: { kitaId: session.user.kitaId, childId },
    });
    if (!thread) return NextResponse.json([]);

    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
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
    const { childId, content } = await request.json();
    if (!childId || !content) {
      return NextResponse.json({ error: 'childId und content erforderlich' }, { status: 400 });
    }

    const child = await prisma.child.findFirst({
      where: { id: childId, kitaId: session.user.kitaId },
    });
    if (!child) {
      return NextResponse.json({ error: 'Kind nicht gefunden' }, { status: 404 });
    }

    const role = (session.user as any).role || 'BETREUER';
    const name = session.user.name || 'Personal';

    // Thread je Kind finden oder anlegen
    let thread = await prisma.messageThread.findFirst({
      where: { kitaId: session.user.kitaId, childId },
    });
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          kitaId: session.user.kitaId,
          childId,
          startedBy: session.user.id,
          startedByName: name,
          startedByRole: role,
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        senderName: name,
        senderEmail: session.user.email || '',
        senderRole: role,
        content,
      },
    });

    // Eltern des Kindes per E-Mail benachrichtigen
    await notifyParentsOfNewMessage({
      kitaId: session.user.kitaId,
      childId,
      senderName: name,
      content,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('[Messages POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
