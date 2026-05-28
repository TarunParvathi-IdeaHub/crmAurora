import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function seedUsers() {
  const prisma = new PrismaClient({
    log: ['error'],
  });
  
  console.log("Seeding institutions and users...");

  // Common password for all users (hashed)
  const commonPassword = "test@123";
  const hashedPassword = await bcrypt.hash(commonPassword, 10);

  // Create Institutions
  console.log("\nCreating institutions...");
  
  const institution1 = await prisma.institution.upsert({
    where: { institutionCode: "AUR001" },
    update: {},
    create: {
      institutionCode: "AUR001",
      institutionName: "Aurora Deemed University",
      institutionArea: "Uppal",
      institutionCity: "Hyderabad",
      institutionState: "Telangana",
      phoneNumber: "9100000662",
      email: "infouppal@aurora.edu.in"
    },
  });
  console.log(`Created institution: ${institution1.institutionName}`);


  console.log("\nCreating users...");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@aurora.edu.in" },
    update: {},
    create: {
      userId: "ADM001",
      email: "admin@aurora.edu.in",
      password: hashedPassword,
      role: "Admin",
    },
  });

  console.log("\nCreating admin records...");

  await prisma.admin.upsert({
    where: { empId: "ADM001" },
    update: {},
    create: {
      institutionId: institution1.id,
      empId: "ADM001",
      firstName: "Ravi",
      lastName: "Kumar",
      designation: "Admin",
      staffType: "Non-Teaching",
      email: "admin@aurora.edu.in",
      mobileNo: "9000000001",
      alternateMobileNo: "9000000002",
      emergencyContact: "9000000003",
      address: "Aurora Campus, Uppal, Hyderabad",
      bloodGroup: "O+",
      caste: "General",
    },
  });

  console.log("Created 8 admission cycles.");

  console.log("\nSeeding completed.");
  console.log("\nSummary:");
  console.log("   - Institutions: 1");
  console.log("   - Admins: 1");

  await prisma.$disconnect();
}

async function main() {
  try {
    await seedUsers();
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

main();