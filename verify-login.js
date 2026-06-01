const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function verify() {
  console.log("=== VERIFY LOGIN CREDENTIALS ===\n");
  
  const tests = [
    { email: 'admin@test.ch', password: 'AdminTest123!', type: 'user' },
    { email: 'leiter@test.ch', password: 'BetreuerTest123!', type: 'user' },
    { email: 'betreuer@test.ch', password: 'BetreuerTest123!', type: 'user' },
    { email: 'eltern@test.ch', password: 'ElternTest123!', type: 'parent' },
  ];
  
  for (const t of tests) {
    let record;
    if (t.type === 'user') {
      record = await prisma.user.findUnique({ where: { email: t.email } });
    } else {
      record = await prisma.parent.findUnique({ where: { email: t.email } });
    }
    
    if (!record) {
      console.log(`❌ ${t.email}: NICHT GEFUNDEN in DB`);
      continue;
    }
    
    const valid = await bcrypt.compare(t.password, record.password);
    console.log(`${valid ? '✅' : '❌'} ${t.email}: ${valid ? 'Passwort KORREKT' : 'Passwort FALSCH'} (Rolle: ${record.role || 'PARENT'})`);
  }
  
  await prisma.$disconnect();
}
verify();
