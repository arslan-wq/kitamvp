import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || (session.user as any).type !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 });
    }

    // Verify parent has access to this child
    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { where: { id: childId } } },
    });

    if (!parent || parent.children.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { childId },
      include: { child: true },
      orderBy: { createdAt: 'desc' },
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

    // Verify parent has access to this child
    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      include: { children: { where: { id: childId } } },
    });

    if (!parent || parent.children.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        senderId: parent.id,
        senderEmail: parent.email,
        childId,
        content,
        senderName: `${parent.firstName} ${parent.lastName}`,
      },
      include: { child: true },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Post parent message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
