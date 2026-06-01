const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  try {
    // Create test KiTA
    const kita = await prisma.kiTA.findFirst({
      where: { name: "Test KiTA" },
    });

    if (!kita) {
      console.log("KiTA not found");
      return;
    }

    console.log("KiTA found:", kita.id);

    // Hash password
    const hashedPassword = await bcrypt.hash("Admin123456", 10);

    // Update user to ADMIN
    const user = await prisma.user.update({
      where: { email: "admin@kita.ch" },
      data: {
        password: hashedPassword,
        name: "Admin User",
        role: "ADMIN",
      },
    });

    console.log("Admin user updated:", user.email);
    console.log("Role:", user.role);
  } catch (error) {
    console.error("Seeding error:", error.message);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
