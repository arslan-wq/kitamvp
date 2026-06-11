import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ChildrenList from './components/ChildrenList';

// Perf: Daten server-seitig vorladen (gleiche Region wie DB) statt
// Client-Wasserfall. Kein leerer "Laden…"-Zustand mehr beim First Paint.
export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const kitaId = (session.user as any).kitaId;

  let initial: { children: any[]; locations: any[]; attendance: any[] } | null = null;
  if (kitaId) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(end.getDate() + 1);

    const [children, locations, attendance] = await Promise.all([
      prisma.child.findMany({
        where: { kitaId },
        include: {
          location: { select: { id: true, name: true } },
          allergies: { select: { id: true, allergen: true, severity: true } },
          parents: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: [{ firstName: 'asc' }],
      }),
      prisma.location.findMany({
        where: { kitaId },
        include: {
          users: { select: { id: true, name: true, email: true, role: true, workingHours: true, locationId: true } },
          children: { select: { id: true, firstName: true, lastName: true, photoUrl: true, locationId: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: today, lt: end }, child: { kitaId } },
        include: { child: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { child: { firstName: 'asc' } },
      }),
    ]);
    // In JSON-serialisierbare Form bringen (Date → ISO-String, wie die API)
    initial = JSON.parse(JSON.stringify({ children, locations, attendance }));
  }

  return (
    <div className="space-y-6">
      <ChildrenList
        initialChildren={initial?.children}
        initialLocations={initial?.locations}
        initialAttendance={initial?.attendance}
      />
    </div>
  );
}
