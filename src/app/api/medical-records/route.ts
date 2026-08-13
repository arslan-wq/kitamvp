import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveChildAccess } from '@/lib/childAccess';
import { isValidPhone } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

const PHONE_FIELDS = ['primaryDoctorPhone', 'pediatricianPhone', 'emergencyDoctorPhone'] as const;

/**
 * GET /api/medical-records
 * Fetch medical record for a specific child
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

    // Fetch medical record with relations
    const medicalRecord = await prisma.medicalRecord.findUnique({
      where: { childId },
      include: {
        vaccinations: {
          orderBy: { vaccinationDate: 'desc' }
        },
        healthHistory: {
          orderBy: { date: 'desc' }
        }
      }
    });

    return NextResponse.json(medicalRecord);
  } catch (error) {
    console.error('Error fetching medical record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medical-records
 * Create or update medical record (upsert)
 * Required fields: childId, kitaId
 * Optional fields: All other fields
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { childId, kitaId: _ignoreKitaId, ...medicalData } = data;

    if (!childId) {
      return NextResponse.json({ error: 'Missing childId' }, { status: 400 });
    }

    for (const field of PHONE_FIELDS) {
      const value = medicalData[field];
      if (value && !isValidPhone(value)) {
        return NextResponse.json({ error: 'Ungültige Telefonnummer' }, { status: 400 });
      }
    }

    // Zugriff: Personal der KiTA ODER Elternteil des Kindes
    const access = await resolveChildAccess(session.user.email, childId);
    if (!access.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert medical record
    const medicalRecord = await prisma.medicalRecord.upsert({
      where: { childId },
      update: medicalData,
      create: {
        childId,
        ...medicalData
      },
      include: {
        vaccinations: true,
        healthHistory: true
      }
    });

    return NextResponse.json(medicalRecord, { status: 200 });
  } catch (error) {
    console.error('Error updating medical record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
