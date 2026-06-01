import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/allergies — Allergie zu einem Kind hinzufügen (nur Personal)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.kitaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!['ADMIN', 'KITA_LEITER', 'BETREUER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { childId, allergen, severity, notes } = await request.json();
  if (!childId || !allergen) {
    return NextResponse.json({ error: 'childId und allergen erforderlich' }, { status: 400 });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, kitaId: session.user.kitaId },
  });
  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const allergy = await prisma.allergy.create({
    data: {
      childId,
      allergen,
      severity: ['MILD', 'MODERATE', 'SEVERE'].includes(severity) ? severity : 'MODERATE',
      notes: notes || null,
    },
  });

  return NextResponse.json(allergy, { status: 201 });
}
