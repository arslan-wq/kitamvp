import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/messages/threads/[id]
 * Fetch a specific thread with all messages and replies
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const threadId = params.id;

    // Fetch thread with all messages
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            replies: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Verify access (same KiTA or parent of the child)
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

    // Mark thread as read for current user if they haven't already
    const rootMessages = thread.messages.filter(m => !m.parentId);
    for (const message of rootMessages) {
      if (!message.readBy.includes(user.id)) {
        await prisma.message.update({
          where: { id: message.id },
          data: {
            readBy: {
              push: user.id,
            },
          },
        });
      }
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messages/threads/[id]
 * Update thread (resolve status, title)
 */
export async function PUT(
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

    // Only staff can update threads
    if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only staff can update threads' },
        { status: 403 }
      );
    }

    // Verify access
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { kitaId: true },
    });

    if (!thread || thread.kitaId !== user.kitaId) {
      return NextResponse.json(
        { error: 'Thread not found or access denied' },
        { status: 403 }
      );
    }

    const { title, isResolved } = data;

    const updated = await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        ...(title !== undefined && { title }),
        ...(isResolved !== undefined && { isResolved }),
      },
      include: {
        messages: true,
        child: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    );
  }
}
