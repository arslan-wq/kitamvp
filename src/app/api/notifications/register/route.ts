import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Register a device token for push notifications
 * Called from service worker or client when user grants notification permission
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Parents register their tokens
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, userAgent } = await request.json();

  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    );
  }

  try {
    // Check if parent exists
    const parent = await prisma.parent.findUnique({
      where: { email: session.user.email },
    });

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      );
    }

    // Check if token already exists
    const existingToken = await prisma.parentDeviceToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      // Token already registered, update it
      await prisma.parentDeviceToken.update({
        where: { id: existingToken.id },
        data: {
          isActive: true,
          userAgent: userAgent || existingToken.userAgent,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Token already registered, updated',
      });
    }

    // Register new token
    const deviceToken = await prisma.parentDeviceToken.create({
      data: {
        parentId: parent.id,
        token,
        userAgent,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Device token registered successfully',
        tokenId: deviceToken.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering device token:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Unregister a device token (when user disables notifications)
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    );
  }

  try {
    const deviceToken = await prisma.parentDeviceToken.findUnique({
      where: { token },
    });

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Verify this token belongs to the current user
    const parent = await prisma.parent.findUnique({
      where: { email: session.user.email },
    });

    if (deviceToken.parentId !== parent?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Soft delete (deactivate)
    await prisma.parentDeviceToken.update({
      where: { id: deviceToken.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Device token unregistered',
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
