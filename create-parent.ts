import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const password = 'Parent123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  const kita = await prisma.kiTA.findFirst();
  
  if (!kita) {
    console.error('No KiTA found');
    return;
  }

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

  try {
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
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('✓ Parent already exists:');
      console.log(`  Email: parent@example.ch`);
      console.log(`  Password: ${password}`);
    } else {
      throw e;
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
