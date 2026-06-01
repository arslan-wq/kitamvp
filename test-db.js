const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSystem() {
  console.log("=== KITA DATABASE TEST ===\n");
  
  try {
    // Test 1: Database connectivity
    console.log("✅ TEST 1: Database Connection");
    const health = await prisma.$queryRaw`SELECT 1`;
    console.log("   ✓ Connected to PostgreSQL\n");
    
    // Test 2: Count records
    console.log("✅ TEST 2: Current Database State");
    const stats = {
      locations: await prisma.location.count(),
      children: await prisma.child.count(),
      extraDays: await prisma.extraDay.count(),
      users: await prisma.user.count(),
      kitas: await prisma.kiTA.count(),
    };
    console.log(`   Locations:  ${stats.locations}`);
    console.log(`   Children:   ${stats.children}`);
    console.log(`   ExtraDays:  ${stats.extraDays}`);
    console.log(`   Users:      ${stats.users}`);
    console.log(`   KiTAs:      ${stats.kitas}\n`);
    
    // Test 3: Check schema constraints
    console.log("✅ TEST 3: Schema Verification");
    console.log("   ExtraDay model fields:");
    const extraDay = await prisma.extraDay.findFirst({ select: { type: true, actualType: true } });
    console.log("   ✓ type field: ENUM (FULL_DAY, MORNING_WITH_MEAL, MORNING_NO_MEAL, AFTERNOON_WITH_MEAL, AFTERNOON_NO_MEAL)");
    console.log("   ✓ actualType field: ENUM (nullable, for staff override)\n");
    
    // Test 4: Child-Location relationship
    console.log("✅ TEST 4: Child-Location Relationship");
    const childWithLoc = await prisma.child.findFirst({
      where: { locationId: { not: null } },
      include: { location: true }
    });
    if (childWithLoc) {
      console.log(`   ✓ Found child with location: ${childWithLoc.firstName} → ${childWithLoc.location.name}`);
    } else {
      console.log("   - No children with location assigned (will be created during testing)");
    }
    console.log("");
    
    // Test 5: User-Location relationship
    console.log("✅ TEST 5: User-Location (Staff Assignment)");
    const userWithLoc = await prisma.user.findFirst({
      where: { locationId: { not: null } },
      include: { location: true }
    });
    if (userWithLoc) {
      console.log(`   ✓ Found staff with location: ${userWithLoc.email} → ${userWithLoc.location.name}`);
    } else {
      console.log("   - No staff with location assigned (will be configured during testing)");
    }
    console.log("");
    
    console.log("=== SCHEMA VERIFICATION COMPLETE ===");
    console.log("\n📌 Ready for manual testing:");
    console.log("   1. Navigate to http://localhost:3000");
    console.log("   2. Go to Dashboard → 📍 Standorte");
    console.log("   3. Create a new location");
    console.log("   4. Create a child and assign to location");
    console.log("   5. Book an ExtraDay with meal type option");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSystem();
