import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/notifications — Benachrichtigungen des aktuellen Nutzers (Personal oder Eltern)
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const kitaId = (session?.user as any)?.kitaId;
  if (!userId || !kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { kitaId, recipientId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const items = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    createdAt: n.createdAt,
    isRead: !!n.readAt,
  }));
  const unreadCount = items.filter((n) => !n.isRead).length;

  return NextResponse.json({ items, unreadCount });
}

// PATCH /api/notifications — als gelesen markieren ({ id } oder { all: true })
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const kitaId = (session?.user as any)?.kitaId;
  if (!userId || !kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const now = new Date();

  if (body.all) {
    await prisma.notification.updateMany({
      where: { kitaId, recipientId: userId, readAt: null },
      data: { readAt: now },
    });
  } else if (body.id) {
    // Nur eigene Benachrichtigungen markieren (mandanten- & nutzergescoped)
    await prisma.notification.updateMany({
      where: { id: body.id, kitaId, recipientId: userId },
      data: { readAt: now },
    });
  } else {
    return NextResponse.json({ error: 'id oder all erforderlich' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
