import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/notifications/send
 * Send notifications for new messages/announcements
 * This would typically be called internally or via a scheduled job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    // Only staff can trigger notifications
    if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only staff can send notifications' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      type, // NEW_MESSAGE, ANNOUNCEMENT, REPLY
      threadId,
      announcementId,
      messageId,
      title,
      message,
      recipientIds = [], // User IDs or Parent IDs
    } = data;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    // Create notification records
    const notifications = await Promise.all(
      recipientIds.map(recipientId =>
        prisma.notification.create({
          data: {
            kitaId: user.kitaId,
            recipientId,
            type,
            title,
            message,
            threadId: threadId || null,
            announcementId: announcementId || null,
            isSent: false,
            sentVia: null,
          },
        })
      )
    );

    // In production, queue these for email sending via a job worker
    // For now, we'll mark them as sent (simulating immediate send)
    // await sendEmailNotifications(notifications, user.kitaId);

    return NextResponse.json(
      {
        success: true,
        notificationCount: notifications.length,
        message: `${notifications.length} notifications queued for sending`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Get pending notifications (staff only, for monitoring)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    // Only staff can view all notifications
    if (!['ADMIN', 'KITA_LEITER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const pending = await prisma.notification.findMany({
      where: {
        kitaId: user.kitaId,
        isSent: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      pendingCount: pending.length,
      notifications: pending,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
