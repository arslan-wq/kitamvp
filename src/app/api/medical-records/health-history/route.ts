import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/medical-records/health-history
 * Fetch health history for a child
 * Query params: childId (required), kitaId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const childId = searchParams.get('childId');
    const kitaId = searchParams.get('kitaId');

    if (!childId || !kitaId) {
      return NextResponse.json(
        { error: 'Missing childId or kitaId' },
        { status: 400 }
      );
    }

    // Verify child belongs to same KiTA
    const child = await prisma.child.findFirst({
      where: { id: childId, kitaId }
    });

    if (!child) {
      return NextResponse.json(
        { error: 'Child not found or access denied' },
        { status: 403 }
      );
    }

    // Get medical record with health history
    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { childId },
      select: {
        id: true,
        healthHistory: {
          orderBy: { date: 'desc' }
        }
      }
    });

    return NextResponse.json(medicalRecord?.healthHistory || []);
  } catch (error) {
    console.error('Error fetching health history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medical-records/health-history
 * Add health history entry
 * Required: childId, kitaId, eventType, condition, date
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { childId, kitaId: _ignore, eventType, condition, date, ...historyData } = data;

    if (!childId || !eventType || !condition || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: childId, eventType, condition, date' },
        { status: 400 }
      );
    }

    // Zugriff: Personal der KiTA ODER Eltern des Kindes
    const access = await resolveChildAccess(session.user.email, childId);
    if (!access.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure medical record exists
    let medicalRecord = await prisma.medicalRecord.findUnique({
      where: { childId }
    });

    if (!medicalRecord) {
      medicalRecord = await prisma.medicalRecord.create({
        data: { childId }
      });
    }

    // Add health history entry
    const healthEntry = await prisma.healthHistory.create({
      data: {
        medicalRecordId: medicalRecord.id,
        eventType,
        condition,
        date: new Date(date),
        ...historyData
      }
    });

    return NextResponse.json(healthEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating health history entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
