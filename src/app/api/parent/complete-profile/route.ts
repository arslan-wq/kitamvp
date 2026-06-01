import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, phone, password } = body;

    const parent = await prisma.parent.findUnique({
      where: { email },
    });

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updated = await prisma.parent.update({
      where: { id: parent.id },
      data: {
        firstName,
        lastName,
        phone,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      email: updated.email,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
