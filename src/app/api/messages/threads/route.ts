import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/messages/threads
 * Fetch message threads for a KiTA
 * Query params:
 * - childId (optional): Filter by child ID
 * - includeAnnouncements (optional): Include announcement threads (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const searchParams = request.nextUrl.searchParams;
    const childId = searchParams.get('childId');
    const includeAnnouncements = searchParams.get('includeAnnouncements') !== 'false';

    // Support both Staff (with kitaId) and Parents (with id)
    let filter: any = {};

    if (user.kitaId) {
      // Staff user - filter by KiTA
      filter.kitaId = user.kitaId;

      if (childId) {
        filter.OR = [
          { childId }, // Messages about specific child
          { childId: null, isAnnouncement: true }, // OR announcements
        ];
      } else if (includeAnnouncements) {
        // Include all threads (child-specific + announcements)
      } else {
        filter.childId = null;
        filter.isAnnouncement = false;
      }
    } else if (user.role === 'PARENT') {
      // Parent user - get messages about their enrolled children + announcements
      const parent = await prisma.parent.findUnique({
        where: { id: user.id },
        select: { children: { select: { id: true, locationId: true } } },
      });

      if (!parent || !parent.children.length) {
        return NextResponse.json([]);
      }

      const childIds = parent.children.map(c => c.id);
      const locationIds = parent.children.map(c => c.locationId).filter(Boolean) as string[];

      // Threads über eigene Kinder ODER Ankündigungen (an alle ODER an einen Standort des Kindes)
      filter.OR = [
        { childId: { in: childIds } },
        { isAnnouncement: true, locationId: null },
        ...(locationIds.length ? [{ isAnnouncement: true, locationId: { in: locationIds } }] : []),
      ];
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch threads with message count and last message
    const threads = await prisma.messageThread.findMany({
      where: filter,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderName: true,
          },
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        location: { select: { id: true, name: true } },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    // Transform for client
    const transformed = threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      childId: thread.childId,
      childName: thread.child ? `${thread.child.firstName} ${thread.child.lastName}` : null,
      locationId: thread.locationId,
      locationName: thread.location?.name || null,
      startedBy: thread.startedByName,
      startedByRole: thread.startedByRole,
      isAnnouncement: thread.isAnnouncement,
      isResolved: thread.isResolved,
      messageCount: thread._count.messages,
      lastMessage: thread.messages[0]
        ? {
            content: thread.messages[0].content,
            senderName: thread.messages[0].senderName,
            createdAt: thread.messages[0].createdAt,
          }
        : null,
      updatedAt: thread.updatedAt,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/threads
 * Create a new message thread
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    // Only staff can create threads
    if (!user.kitaId || !['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only staff can create message threads' },
        { status: 403 }
      );
    }

    const data = await request.json();

    const {
      title,
      content,
      childId,
      isAnnouncement = false,
      attachments = [],
    } = data;
    let locationId = data.locationId || null;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // If targeting a child, verify it's in this KiTA
    if (childId) {
      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: { kitaId: true },
      });

      if (!child || child.kitaId !== user.kitaId) {
        return NextResponse.json(
          { error: 'Child not found or access denied' },
          { status: 403 }
        );
      }
      locationId = null; // Kind-Threads tragen keinen Standort-Broadcast
    }

    // Standort-Berechtigung für Ankündigungen
    if (isAnnouncement && !childId) {
      if (user.role === 'ADMIN') {
        if (locationId) {
          const loc = await prisma.location.findFirst({ where: { id: locationId, kitaId: user.kitaId } });
          if (!loc) return NextResponse.json({ error: 'Standort nicht gefunden' }, { status: 400 });
        }
        // locationId null = an alle Standorte (nur Admin)
      } else {
        // KITA_LEITER / BETREUER dürfen nur an den EIGENEN Standort senden
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } });
        if (!dbUser?.locationId) {
          return NextResponse.json({ error: 'Ihnen ist kein Standort zugewiesen — Ankündigung nicht möglich.' }, { status: 403 });
        }
        if (locationId && locationId !== dbUser.locationId) {
          return NextResponse.json({ error: 'Sie dürfen nur an Ihren eigenen Standort senden.' }, { status: 403 });
        }
        locationId = dbUser.locationId; // erzwingen
      }
    }

    // Create thread with initial message
    const thread = await prisma.messageThread.create({
      data: {
        kitaId: user.kitaId,
        locationId,
        childId: childId || null,
        title,
        startedBy: user.id,
        startedByName: user.name || 'Unbekannt',
        startedByRole: user.role,
        isAnnouncement,
        messages: {
          create: {
            content,
            attachments,
            senderId: user.id,
            senderName: user.name || 'Unbekannt',
            senderEmail: user.email,
            senderRole: user.role,
          },
        },
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

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
}
