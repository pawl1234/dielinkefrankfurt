/**
 * Simplified script to reset Prisma migrations
 */
import * as db from './db.mjs';

console.log('🔄 Resetting Prisma migrations for PostgreSQL...');

async function main() {
  try {
    // Validate environment and DATABASE_URL
    if (!db.validateEnvironment()) {
      process.exit(1);
    }
    
    // Ensure schema is properly configured
    if (!db.validateSchema()) {
      process.exit(1);
    }
    
    // Reset migrations directory and create fresh migrations
    if (!db.resetMigrations()) {
      process.exit(1);
    }
    
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    if (!db.deploySchema()) {
      process.exit(1);
    }
    
    console.log('✅ Migration reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration reset:', error);
    process.exit(1);
  }
}

// Run the main function
main();