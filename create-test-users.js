const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log("=== ERSTELLE TEST-BENUTZER ===\n");
  
  try {
    // Finde oder erstelle eine KiTA
    let kita = await prisma.kiTA.findFirst();
    if (!kita) {
      console.log("❌ Keine KiTA gefunden! Erstelle Test-KiTA...");
      kita = await prisma.kiTA.create({
        data: {
          name: "Test KiTA",
          address: "Teststrasse 1",
          phone: "+41 123 456 789",
          email: "kita@test.ch",
          maxChildren: 20,
        }
      });
    }
    console.log(`✓ Verwende KiTA: ${kita.name}\n`);

    // Test-Passwörter
    const passwords = {
      admin: "AdminTest123!",
      betreuer: "BetreuerTest123!",
      parent: "ElternTest123!"
    };

    // 1. ADMIN
    console.log("👤 TEST-BENUTZER 1: ADMIN");
    const adminHash = await bcrypt.hash(passwords.admin, 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.ch' },
      update: { password: adminHash },
      create: {
        email: 'admin@test.ch',
        password: adminHash,
        name: 'Admin Testuser',
        role: 'ADMIN',
        kitaId: kita.id,
      }
    });
    console.log(`   Email: admin@test.ch`);
    console.log(`   Passwort: ${passwords.admin}`);
    console.log(`   Rolle: ADMIN\n`);

    // 2. KITA_LEITER
    console.log("👤 TEST-BENUTZER 2: KITA_LEITER");
    const leiterHash = await bcrypt.hash(passwords.betreuer, 10);
    const leiter = await prisma.user.upsert({
      where: { email: 'leiter@test.ch' },
      update: { password: leiterHash },
      create: {
        email: 'leiter@test.ch',
        password: leiterHash,
        name: 'Leiter Testuser',
        role: 'KITA_LEITER',
        kitaId: kita.id,
      }
    });
    console.log(`   Email: leiter@test.ch`);
    console.log(`   Passwort: ${passwords.betreuer}`);
    console.log(`   Rolle: KITA_LEITER\n`);

    // 3. BETREUER
    console.log("👤 TEST-BENUTZER 3: BETREUER");
    const betreuerHash = await bcrypt.hash(passwords.betreuer, 10);
    const betreuer = await prisma.user.upsert({
      where: { email: 'betreuer@test.ch' },
      update: { password: betreuerHash },
      create: {
        email: 'betreuer@test.ch',
        password: betreuerHash,
        name: 'Betreuer Testuser',
        role: 'BETREUER',
        kitaId: kita.id,
      }
    });
    console.log(`   Email: betreuer@test.ch`);
    console.log(`   Passwort: ${passwords.betreuer}`);
    console.log(`   Rolle: BETREUER\n`);

    // 4. PARENT
    console.log("👤 TEST-BENUTZER 4: PARENT (Eltern)");
    const parentHash = await bcrypt.hash(passwords.parent, 10);
    const parent = await prisma.parent.upsert({
      where: { email: 'eltern@test.ch' },
      update: { password: parentHash },
      create: {
        email: 'eltern@test.ch',
        password: parentHash,
        firstName: 'Eltern',
        lastName: 'Testuser',
        phone: '+41 987 654 321',
      }
    });
    console.log(`   Email: eltern@test.ch`);
    console.log(`   Passwort: ${passwords.parent}`);
    console.log(`   Rolle: PARENT\n`);

    // Erstelle Test-Kind für Eltern
    console.log("👶 ERSTELLE TEST-KIND:");
    const child = await prisma.child.create({
      data: {
        firstName: 'Tim',
        lastName: 'Testuser',
        birthDate: new Date('2020-05-15'),
        kitaId: kita.id,
        parents: {
          connect: [{ id: parent.id }]
        }
      },
      include: { parents: true }
    });
    console.log(`   Name: ${child.firstName} ${child.lastName}`);
    console.log(`   Geburtsdatum: 15.05.2020`);
    console.log(`   Eltern: ${parent.firstName} ${parent.lastName}\n`);

    console.log("=== ✅ TEST-BENUTZER ERFOLGREICH ERSTELLT ===\n");

  } catch (error) {
    console.error("❌ Fehler:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
