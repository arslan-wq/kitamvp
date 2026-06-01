const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@kita.ch' }
    });
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Password exists:', user.password ? 'YES' : 'NO');
      console.log('Password length:', user.password?.length || 0);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
