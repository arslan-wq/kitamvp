import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/announcements
 * Fetch announcements for a KiTA
 * Query params:
 * - limit (optional): Number of announcements to return (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    let kitaId: string | null = null;

    // Determine KiTA ID based on user type
    if (user.kitaId) {
      kitaId = user.kitaId;
    } else if (user.role === 'PARENT') {
      // Parents: get KiTA ID from their first child
      const parent = await prisma.parent.findUnique({
        where: { id: user.id },
        select: { children: { select: { kitaId: true }, take: 1 } },
      });
      if (!parent?.children.length) {
        return NextResponse.json([]);
      }
      kitaId = parent.children[0].kitaId;
    }

    if (!kitaId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build filter based on user role
    const filter: any = {
      kitaId,
      isPublished: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    // Staff sees all announcements
    // Parents only see announcements meant for them
    if (user.role === 'PARENT') {
      filter.targetAudience = {
        in: ['ALL', 'PARENTS_ONLY'],
      };
    }

    const announcements = await prisma.announcement.findMany({
      where: filter,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        attachments: true,
        createdByName: true,
        targetAudience: true,
        publishedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/announcements
 * Create a new announcement (staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    // Only staff can create announcements
    if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only staff can create announcements' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      title,
      content,
      attachments = [],
      isPublished = true,
      targetAudience = 'ALL',
      expiresAt = null,
    } = data;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        kitaId: user.kitaId,
        title,
        content,
        attachments,
        isPublished,
        targetAudience,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user.id,
        createdByName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        publishedAt: isPublished ? new Date() : null,
      },
    });

    // Create announcement thread for tracking
    const thread = await prisma.messageThread.create({
      data: {
        kitaId: user.kitaId,
        title: `📢 ${title}`,
        startedBy: user.id,
        startedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        startedByRole: user.role,
        isAnnouncement: true,
        messages: {
          create: {
            content,
            attachments,
            senderId: user.id,
            senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            senderEmail: user.email,
            senderRole: user.role,
          },
        },
      },
    });

    return NextResponse.json({ announcement, thread }, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}
