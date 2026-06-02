import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PUT /api/parents/[id] — Kontaktdaten eines Elternteils bearbeiten.
// Erlaubt: der Elternteil selbst ODER Personal, das eine KiTA mit dessen Kind teilt.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const target = await prisma.parent.findUnique({
    where: { id: params.id },
    include: { children: { select: { kitaId: true } } },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sessionUser = session.user as any;
  const isSelf = sessionUser.id === params.id && sessionUser.type === 'parent';

  let isStaff = false;
  if (!isSelf) {
    const staff = await prisma.user.findUnique({ where: { email: session.user.email } });
    isStaff = !!staff?.kitaId && target.children.some((c) => c.kitaId === staff.kitaId);
  }
  if (!isSelf && !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { firstName, lastName, phone } = await request.json();
  const updated = await prisma.parent.update({
    where: { id: params.id },
    data: {
      firstName: firstName ?? target.firstName,
      lastName: lastName ?? target.lastName,
      phone: phone ?? target.phone,
    },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  });

  return NextResponse.json(updated);
}
