const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const tests = [
    { email: 'admin@test.ch',    pw: 'AdminTest123!',    type: 'user' },
    { email: 'leiter@test.ch',   pw: 'BetreuerTest123!', type: 'user' },
    { email: 'betreuer@test.ch', pw: 'BetreuerTest123!', type: 'user' },
    { email: 'eltern@test.ch',   pw: 'ElternTest123!',   type: 'parent' },
  ];
  console.log("VERIFIZIERUNG (live gegen DB):\n");
  for (const t of tests) {
    const rec = t.type === 'user'
      ? await prisma.user.findUnique({ where: { email: t.email } })
      : await prisma.parent.findUnique({ where: { email: t.email } });
    if (!rec) { console.log(`  ❌ ${t.email}: nicht in DB`); continue; }
    const ok = await bcrypt.compare(t.pw, rec.password);
    console.log(`  ${ok ? '✅' : '❌'} ${t.email.padEnd(20)} ${t.pw.padEnd(18)} (${rec.role || 'PARENT'})`);
  }
  await prisma.$disconnect();
}
main();
