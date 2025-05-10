import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create Prisma Client with logging
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

// Enhanced logging via middleware instead of events
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  console.log(`Query: ${params.model}.${params.action} took ${after - before}ms`);
  return result;
});

// Log database connection status at startup
async function checkConnection() {
  try {
    // Run a simple query to test the connection
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log('✅ Database connection successfully established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Call the function immediately
checkConnection();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;