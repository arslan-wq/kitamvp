import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const users = await prisma.user.findMany();
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@kita.ch' },
    });

    return Response.json({
      totalUsers: users.length,
      allUsers: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: u.password.substring(0, 20) + '...',
      })),
      adminUser: adminUser ? {
        found: true,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        passwordHashLength: adminUser.password.length,
      } : { found: false },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
