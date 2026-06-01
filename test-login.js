const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@kita.ch' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    const isValid = await bcrypt.compare('Admin123456', user.password || '');
    console.log('✅ Password is valid:', isValid);

    if (isValid) {
      console.log('✅ LOGIN WOULD WORK! User can authenticate with: admin@kita.ch / Admin123456');
    } else {
      console.log('❌ Password mismatch!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
