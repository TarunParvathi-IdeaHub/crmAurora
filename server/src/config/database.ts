import { PrismaClient } from "@prisma/client";

// Reuse a single Prisma client instance (avoids connection pool exhaustion)
const prisma = new PrismaClient({ log: ['error'] });

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

export default prisma;
