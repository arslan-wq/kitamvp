import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ScheduleView from './components/ScheduleView';

// Perf: Belegungsplan-Daten server-seitig vorladen (gleiche Region wie DB)
// statt 7 Client-Fetches im Wasserfall. Inhalt erscheint sofort.
export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');
  const kitaId = (session.user as any)?.kitaId as string | undefined;

  let initial: any = undefined;
  if (kitaId) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(end.getDate() + 1);
    const childSel = { id: true, firstName: true, lastName: true, locationId: true, photoUrl: true, defaultPickupPerson: true };

    const [bookings, locations, children, attendance, notices, extraDaysToday, calExtra] = await Promise.all([
      prisma.booking.findMany({
        where: { kitaId },
        include: { child: { select: childSel } },
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
        take: 300,
      }),
      prisma.location.findMany({
        where: { kitaId },
        include: {
          users: { select: { id: true, name: true, email: true, role: true, workingHours: true, locationId: true } },
          children: { select: { id: true, firstName: true, lastName: true, photoUrl: true, locationId: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.child.findMany({
        where: { kitaId },
        select: { id: true, firstName: true, lastName: true, locationId: true },
        orderBy: [{ firstName: 'asc' }],
      }),
      prisma.attendance.findMany({
        where: { date: { gte: today, lt: end }, child: { kitaId } },
        include: { child: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { child: { firstName: 'asc' } },
      }),
      prisma.dayNotice.findMany({
        where: { kitaId, date: { gte: today, lt: end } },
        include: { child: { select: { id: true, firstName: true, lastName: true, locationId: true, defaultPickupPerson: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.extraDay.findMany({
        where: { kitaId, date: { gte: today, lt: end } },
        include: { child: { select: { id: true, firstName: true, lastName: true, locationId: true, photoUrl: true } } },
        orderBy: { date: 'asc' },
        take: 500,
      }),
      prisma.extraDay.findMany({
        where: { kitaId },
        include: { child: { select: { id: true, firstName: true, lastName: true, locationId: true, photoUrl: true } } },
        orderBy: { date: 'asc' },
        take: 500,
      }),
    ]);

    initial = JSON.parse(JSON.stringify({
      bookings, locations, children, attendance, notices, extraDays: extraDaysToday, calExtra,
    }));
  }

  return <ScheduleView initial={initial} />;
}
