import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';

// POST /api/allergies — Allergie hinzufügen (Personal der KiTA ODER Eltern des Kindes)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { childId, allergen, severity, notes } = await request.json();
  if (!childId || !allergen) {
    return NextResponse.json({ error: 'childId und allergen erforderlich' }, { status: 400 });
  }

  const access = await resolveChildAccess(session.user.email, childId);
  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
