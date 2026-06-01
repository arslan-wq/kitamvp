import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateMedicalRecordSchema } from '@/lib/validation';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const child = await prisma.child.findUnique({
      where: { id: params.id },
      include: { medicalRecord: true },
    });

    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(child.medicalRecord || {});
  } catch (error) {
    console.error('Error fetching medical record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const child = await prisma.child.findUnique({
      where: { id: params.id },
    });

    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateMedicalRecordSchema.parse(body);

    // Create or update medical record
    const medicalRecord = await prisma.medicalRecord.upsert({
      where: { childId: params.id },
      update: data,
      create: {
        childId: params.id,
        ...data,
      },
    });

    return NextResponse.json(medicalRecord);
  } catch (error: any) {
    console.error('Error updating medical record:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
