// Test database connection
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

// Prefer DIRECT_URL for testing (used for migrations)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

console.log('Testing connection with:', connectionString?.replace(/:[^:@]+@/, ':****@'));

if (!connectionString) {
  console.error('No DATABASE_URL or DIRECT_URL found');
  process.exit(1);
}

// Parse connection string to determine SSL config
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com');
const requiresSSL = connectionString.includes('sslmode=require') || isSupabase;

// Check if CA is configured (via NODE_EXTRA_CA_CERTS set by instrumentation.ts)
const hasCa = !!process.env.NODE_EXTRA_CA_CERTS || !!process.env.SUPABASE_DB_CA_PEM;
const isPooler = connectionString.includes(':6543') || connectionString.includes('pooler.supabase.com');

if (requiresSSL && isPooler && !hasCa) {
  console.warn('⚠️  Pooler connection (6543) detected but no CA certificate found.');
  console.warn('   Set SUPABASE_DB_CA_PEM environment variable for pooler connections.');
}

const pool = new Pool({
  connectionString,
  ssl: requiresSSL ? {
    rejectUnauthorized: true, // Strict TLS validation (CA must be provided via NODE_EXTRA_CA_CERTS)
    require: true,
  } : false,
});

pool.query('SELECT NOW() as time, version() as version')
  .then((result) => {
    console.log('✅ Connection successful!');
    console.log('Time:', result.rows[0].time);
    console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    process.exit(1);
  });

