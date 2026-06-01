import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const kitas = await prisma.kiTA.findMany();
    const users = await prisma.user.findMany();

    return Response.json({
      database: {
        connected: true,
        kitas: kitas.length,
        users: users.length,
      },
      kitas: kitas.map(k => ({
        id: k.id,
        name: k.name,
        address: k.address,
      })),
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        kitaId: u.kitaId,
      })),
    });
  } catch (error) {
    return Response.json({
      error: String(error),
      type: error instanceof Error ? error.name : 'Unknown',
    }, { status: 500 });
  }
}
