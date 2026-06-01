import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...');

  // Create a test KiTA
  const kita = await prisma.kiTA.create({
    data: {
      name: 'Test KiTA',
      address: 'Teststrasse 123, 8000 Zurich',
      phone: '+41 44 123 4567',
      email: 'test@kita.ch',
      maxChildren: 20,
    },
  });
  console.log('✓ Created KiTA:', kita.name);

  // Create staff user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const staff = await prisma.user.create({
    data: {
      email: 'betreuer@kita.ch',
      password: hashedPassword,
      name: 'Maria Müller',
      role: 'BETREUER',
      kitaId: kita.id,
    },
  });
  console.log('✓ Created staff user:', staff.email);

  // Create parent user
  const parent = await prisma.parent.create({
    data: {
      email: 'parent@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      phone: '+41 79 123 4567',
    },
  });
  console.log('✓ Created parent user:', parent.email);

  // Create two test children
  const child1 = await prisma.child.create({
    data: {
      firstName: 'Maria',
      lastName: 'Smith',
      birthDate: new Date('2021-05-15'),
      kitaId: kita.id,
      parents: {
        connect: [{ id: parent.id }],
      },
      allergies: {
        create: [
          {
            allergen: 'Erdnüsse',
            severity: 'SEVERE',
            notes: 'Anaphylaxis risk',
          },
          {
            allergen: 'Milchprodukte',
            severity: 'MODERATE',
            notes: 'Magen-Darm-Probleme',
          },
        ],
      },
    },
  });
  console.log('✓ Created child 1:', child1.firstName, child1.lastName);

  const child2 = await prisma.child.create({
    data: {
      firstName: 'Anna',
      lastName: 'Smith',
      birthDate: new Date('2022-08-20'),
      kitaId: kita.id,
      parents: {
        connect: [{ id: parent.id }],
      },
    },
  });
  console.log('✓ Created child 2:', child2.firstName, child2.lastName);

  // Create a message thread (staff → parent about Maria)
  const thread1 = await prisma.messageThread.create({
    data: {
      kitaId: kita.id,
      childId: child1.id,
      title: 'Maria macht großartige Fortschritte',
      startedBy: staff.id,
      startedByName: staff.name,
      startedByRole: staff.role,
      messages: {
        create: {
          senderId: staff.id,
          senderName: staff.name,
          senderEmail: staff.email,
          senderRole: staff.role,
          content:
            'Hallo John,\n\nMaría hat heute einen fantastischen Tag gehabt! Sie hat sehr gut mit den anderen Kindern zusammengespielt und neue Freundschaften gemacht. Besonders beeindruckend war ihre Kreativität beim Kunstprojekt heute Morgen.\n\nBeste Grüße,\nMaría Müller',
          attachments: [],
          readBy: [staff.id, parent.id],
        },
      },
    },
  });
  console.log('✓ Created message thread about Maria');

  // Add a parent reply
  await prisma.message.create({
    data: {
      threadId: thread1.id,
      parentId: null,
      senderId: parent.id,
      senderName: `${parent.firstName} ${parent.lastName}`,
      senderEmail: parent.email,
      senderRole: 'PARENT',
      content:
        'Vielen Dank für das Update! Das freut uns riesig zu hören. Marías Selbstvertrauen wächst jeden Tag. Wir sind sehr dankbar für eure großartige Arbeit!',
      attachments: [],
      readBy: [staff.id, parent.id],
    },
  });
  console.log('✓ Created parent reply');

  // Create another thread about Anna
  await prisma.messageThread.create({
    data: {
      kitaId: kita.id,
      childId: child2.id,
      title: 'Annas erste Woche Rückblick',
      startedBy: staff.id,
      startedByName: staff.name,
      startedByRole: staff.role,
      messages: {
        create: {
          senderId: staff.id,
          senderName: staff.name,
          senderEmail: staff.email,
          senderRole: staff.role,
          content:
            'Lieber John,\n\nAnna integriert sich wunderbar in unsere Gruppe! Die erste Woche ist vorbei und sie hat bereits gute Fortschritte gemacht. Sie genießt besonders die Spielzeit mit den Bauklötzen.\n\nMit freundlichen Grüßen,\nMaría Müller',
          attachments: [],
          readBy: [staff.id],
        },
      },
    },
  });
  console.log('✓ Created message thread about Anna');

  // Create an announcement
  await prisma.announcement.create({
    data: {
      kitaId: kita.id,
      title: 'Sommerferien Schließung',
      content:
        'Die KiTA wird vom 27. Juli bis 31. August 2024 geschlossen sein für die Sommerferien. Die KiTA öffnet wieder am 2. September. Bitte machen Sie entsprechende Betreuungsarrangements.\n\nWir wünschen euch einen schönen Sommer!',
      attachments: [],
      createdBy: staff.id,
      createdByName: staff.name,
      targetAudience: 'ALL',
      expiresAt: new Date('2024-09-02'),
    },
  });
  console.log('✓ Created announcement');

  // Create notification records
  await prisma.notification.create({
    data: {
      kitaId: kita.id,
      recipientId: parent.id,
      type: 'NEW_MESSAGE',
      title: 'Neue Nachricht über Maria',
      message: 'Maria macht großartige Fortschritte',
      threadId: thread1.id,
      isSent: true,
      sentVia: 'EMAIL',
    },
  });
  console.log('✓ Created notification');

  console.log('\n✅ Seed data created successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('  Staff Login:');
  console.log('    Email: betreuer@kita.ch');
  console.log('    Password: password123');
  console.log('\n  Parent Login:');
  console.log('    Email: parent@example.com');
  console.log('    Password: password123');
  console.log('\n🎯 What to test:');
  console.log('  1. Login as staff → view created message threads');
  console.log('  2. Login as parent → view message threads in inbox');
  console.log('  3. Parent replies to thread');
  console.log('  4. Staff views parent reply');
  console.log('  5. Parent views announcement in "Ankündigungen" tab');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
