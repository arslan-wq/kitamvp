const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      include: { kita: { select: { id: true, name: true } } }
    });

    console.log('Current Users:\n');
    users.forEach(u => {
      console.log(`Email: ${u.email}`);
      console.log(`Role: ${u.role}`);
      console.log(`KiTA: ${u.kita?.name || 'NONE'} (${u.kitaId || 'NULL'})`);
      console.log('---');
    });

    // Get default KiTA
    const kita = await prisma.kiTA.findFirst({
      where: { name: 'Demo KiTA' }
    });

    console.log(`\nDefault KiTA ID: ${kita?.id}`);

  } finally {
    await prisma.$disconnect();
  }
}

check();
