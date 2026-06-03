import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifyParentsOfNewMessage } from '@/lib/notifyMessage';

/**
 * POST /api/messages/threads/[id]/replies
 * Add a reply to a message or start new reply thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const threadId = params.id;
    const data = await request.json();

    const {
      content,
      parentMessageId,
      attachments = [],
    } = data;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // T10: Personal-Antworten nur durch Admin (Eltern dürfen weiterhin antworten)
    if (user.role !== 'PARENT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nur Admin darf Pinnwand-Einträge versenden' },
        { status: 403 }
      );
    }

    // Verify thread exists and user has access
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { kitaId: true, childId: true },
    });

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    if (thread.kitaId !== user.kitaId) {
      // Check if user is a parent of the child
      if (user.role === 'PARENT' && thread.childId) {
        const enrollment = await prisma.child.findUnique({
          where: { id: thread.childId },
          select: {
            parents: {
              where: { id: user.id },
              select: { id: true },
            },
          },
        });

        if (!enrollment?.parents.length) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // If replying to a specific message, verify it exists in this thread
    if (parentMessageId) {
      const parentMessage = await prisma.message.findUnique({
        where: { id: parentMessageId },
        select: { threadId: true },
      });

      if (!parentMessage || parentMessage.threadId !== threadId) {
        return NextResponse.json(
          { error: 'Parent message not found' },
          { status: 404 }
        );
      }
    }

    // Create reply
    const reply = await prisma.message.create({
      data: {
        threadId,
        parentId: parentMessageId || null,
        content,
        attachments,
        senderId: user.id,
        senderName: user.name || 'Unbekannt',
        senderEmail: user.email,
        senderRole: user.role,
        readBy: [user.id], // Sender has read their own message
      },
      include: {
        replies: true,
      },
    });

    // Update thread updatedAt
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Antwort von Personal in einem Kind-Thread → Eltern benachrichtigen
    if (user.role !== 'PARENT' && thread.childId) {
      await notifyParentsOfNewMessage({
        kitaId: thread.kitaId,
        childId: thread.childId,
        senderName: user.name || 'KitaLuna',
        content,
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}
