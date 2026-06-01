const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = 'Parent123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  const kita = await prisma.kita.findFirst();
  
  let child = await prisma.child.findFirst();
  
  if (!child) {
    child = await prisma.child.create({
      data: {
        firstName: 'Emma',
        lastName: 'Müller',
        birthDate: new Date('2021-06-15'),
        kitaId: kita.id,
      },
    });
  }

  const parent = await prisma.parent.create({
    data: {
      email: 'parent@example.ch',
      password: hashedPassword,
      firstName: 'Julia',
      lastName: 'Müller',
      phone: '+41 79 123 45 67',
      children: {
        connect: { id: child.id },
      },
    },
  });

  console.log('✓ Parent created:');
  console.log(`  Email: ${parent.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Name: ${parent.firstName} ${parent.lastName}`);
  console.log(`  Child: ${child.firstName} ${child.lastName}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
