const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setup() {
  try {
    // 1. Create default KiTA if not exists
    let kita = await prisma.kiTA.findFirst({
      where: { name: 'Demo KiTA' },
    });

    if (!kita) {
      kita = await prisma.kiTA.create({
        data: {
          name: 'Demo KiTA',
          address: 'Beispielstrasse 1, 8000 Zürich',
          phone: '+41 44 123 4567',
          email: 'demo@kita.ch',
          maxChildren: 30,
        },
      });
      console.log('✓ Demo KiTA created');
      console.log(`  KiTA ID: ${kita.id}`);
    } else {
      console.log('✓ Demo KiTA already exists');
    }

    // 2. Create demo user
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@kita.ch' },
    });

    if (existingUser) {
      console.log('✓ Demo user already exists');
    } else {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      
      const user = await prisma.user.create({
        data: {
          email: 'demo@kita.ch',
          password: hashedPassword,
          name: 'Demo Benutzer',
          role: 'BETREUER',
          kitaId: kita.id,
        },
      });

      console.log('✓ Demo user created successfully');
      console.log(`  Email: demo@kita.ch`);
      console.log(`  Password: demo123`);
    }

    console.log('\n✅ Setup complete! Ready to login.');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
