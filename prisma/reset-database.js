/**
 * Script to completely reset the database schema
 */
const db = require('./db');

console.log('🔄 Resetting PostgreSQL database...');

async function main() {
  try {
    // Validate environment and DATABASE_URL
    if (!db.validateEnvironment()) {
      process.exit(1);
    }
    
    // Reset database (drop and recreate schema)
    if (!await db.resetDatabase()) {
      console.error('❌ Database reset failed');
      process.exit(1);
    }
    
    // Reset migrations
    if (!db.resetMigrations()) {
      console.error('❌ Migration reset failed');
      process.exit(1);
    }
    
    // Deploy schema
    if (!db.deploySchema()) {
      console.error('❌ Schema deployment failed');
      process.exit(1);
    }
    
    console.log('✅ Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  }
}

// Run the main function
main();