import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createContractSchema } from '@/lib/validation';

export async function GET(
  __request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const child = await prisma.child.findUnique({
      where: { id: params.id },
      include: { contracts: { orderBy: { startDate: 'desc' } } },
    });

    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(child.contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.role === 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data = createContractSchema.parse(body);

    const child = await prisma.child.findUnique({ where: { id: params.id } });
    if (!child || child.kitaId !== user.kitaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contract = await prisma.contract.create({
      data: {
        ...data,
        childId: params.id,
        kitaId: user.kitaId,
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contract:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
