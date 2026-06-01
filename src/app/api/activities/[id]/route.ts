import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: params.id,
      kitaId: session.user.kitaId,
    },
    include: {
      child: true,
    },
  });

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  return NextResponse.json(activity);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: params.id,
      kitaId: session.user.kitaId,
    },
  });

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  const { type, timestamp, details, notes, photoUrl } = await request.json();

  const updated = await prisma.activity.update({
    where: { id: params.id },
    data: {
      type: type || activity.type,
      timestamp: timestamp ? new Date(timestamp) : activity.timestamp,
      details: details !== undefined ? details : activity.details,
      notes: notes !== undefined ? notes : activity.notes,
      photoUrl: photoUrl !== undefined ? photoUrl : activity.photoUrl,
    },
    include: {
      child: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: params.id,
      kitaId: session.user.kitaId,
    },
  });

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  await prisma.activity.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
