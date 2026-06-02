import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/medical-records/vaccinations
 * Fetch vaccinations for a child
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

    // Get medical record with vaccinations
    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { childId },
      select: {
        id: true,
        vaccinations: {
          orderBy: { vaccinationDate: 'desc' }
        }
      }
    });

    return NextResponse.json(medicalRecord?.vaccinations || []);
  } catch (error) {
    console.error('Error fetching vaccinations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medical-records/vaccinations
 * Add vaccination record
 * Required: childId, kitaId, vaccineName, vaccinationDate
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { childId, kitaId: _ignore, vaccineName, vaccinationDate, ...vaccData } = data;

    if (!childId || !vaccineName || !vaccinationDate) {
      return NextResponse.json(
        { error: 'Missing required fields: childId, vaccineName, vaccinationDate' },
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

    // Add vaccination — Datums-Strings sicher in DateTime konvertieren
    const vaccination = await prisma.vaccination.create({
      data: {
        medicalRecordId: medicalRecord.id,
        vaccineName,
        vaccinationDate: new Date(vaccinationDate),
        ...vaccData,
        ...(vaccData.nextDueDate ? { nextDueDate: new Date(vaccData.nextDueDate) } : {}),
      }
    });

    return NextResponse.json(vaccination, { status: 201 });
  } catch (error) {
    console.error('Error creating vaccination:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
