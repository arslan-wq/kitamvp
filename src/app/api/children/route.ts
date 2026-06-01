import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendParentInvitationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const kitaId = (session.user as any).kitaId;
    const children = await prisma.child.findMany({
      where: { kitaId },
      include: { parents: true },
    });
    return NextResponse.json(children);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, birthDate, parentEmail, locationId } = body;

    if (!parentEmail) {
      return NextResponse.json(
        { error: 'Parent email is required' },
        { status: 400 }
      );
    }

    const kitaId = (session.user as any).kitaId;

    // Find or create parent
    let parent = await prisma.parent.findUnique({
      where: { email: parentEmail },
    });

    const tempPassword = Math.random().toString(36).substring(2, 10) +
                        Math.random().toString(36).substring(2, 10).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    if (!parent) {
      parent = await prisma.parent.create({
        data: {
          email: parentEmail,
          password: hashedPassword,
          firstName: 'Zu definieren',
          lastName: 'Zu definieren',
          phone: '',
        },
      });

      // Send invitation email
      try {
        await sendParentInvitationEmail(parentEmail, firstName, tempPassword);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Create child linked to parent and optionally assign to location
    const child = await prisma.child.create({
      data: {
        firstName,
        lastName,
        birthDate: new Date(birthDate),
        kitaId,
        ...(locationId && { locationId }),
        parents: {
          connect: [{ id: parent.id }],
        },
      },
      include: {
        location: true,
        parents: true,
      },
    });

    return NextResponse.json(child, { status: 201 });
  } catch (error) {
    console.error('Error creating child:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create child' },
      { status: 500 }
    );
  }
}
