// AWS Sync Configuration with environment variable defaults

export const SYNC_CONFIG = {
  // Sync interval in minutes (how often cron runs)
  SYNC_INTERVAL_MINUTES: parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10),
  
  // Lock TTL in seconds (how long lock is held)
  SYNC_LOCK_TTL_SECONDS: parseInt(process.env.SYNC_LOCK_TTL_SECONDS || '240', 10),
  
  // Maximum accounts to sync per run
  MAX_ACCOUNTS_PER_RUN: parseInt(process.env.MAX_ACCOUNTS_PER_RUN || '10', 10),
  
  // How many days of cost data to fetch
  AWS_SYNC_LOOKBACK_DAYS: parseInt(process.env.AWS_SYNC_LOOKBACK_DAYS || '30', 10),
}

