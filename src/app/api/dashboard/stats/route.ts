import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    
    // Only allow staff
    if (!user.kitaId) {
      return NextResponse.json({ error: 'No KiTA assigned' }, { status: 403 });
    }

    // Get total children
    const totalChildren = await prisma.child.count({
      where: { kitaId: user.kitaId },
    });

    // Get today's attendance count
    const today = new Date().toISOString().split('T')[0];
    const presentToday = await prisma.attendance.count({
      where: {
        date: {
          gte: new Date(`${today}T00:00:00Z`),
          lt: new Date(`${today}T23:59:59Z`),
        },
        checkInTime: { not: null },
      },
    });

    // Get absent count
    const absentToday = Math.max(0, totalChildren - presentToday);

    // Get staff count
    const staffCount = await prisma.user.count({
      where: { kitaId: user.kitaId },
    });

    return NextResponse.json({
      totalChildren,
      presentToday,
      absentToday,
      staffCount,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
