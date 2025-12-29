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

const pool = new Pool({
  connectionString,
  ssl: requiresSSL ? {
    rejectUnauthorized: false, // Accept self-signed certificates for Supabase
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

