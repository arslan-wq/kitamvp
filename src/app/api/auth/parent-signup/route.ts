import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { isValidPhone } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone, childId } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, Passwort, Vorname und Nachname erforderlich' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      );
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Ungültige Telefonnummer' },
        { status: 400 }
      );
    }

    const existingParent = await prisma.parent.findUnique({
      where: { email },
    });

    if (existingParent) {
      return NextResponse.json(
        { error: 'Diese E-Mail ist bereits registriert' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const parentData: any = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
    };

    if (childId) {
      parentData.children = {
        connect: { id: childId },
      };
    }

    await prisma.parent.create({
      data: parentData,
    });

    return NextResponse.json(
      { message: 'Eltern-Konto erfolgreich erstellt' },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Parent signup error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
