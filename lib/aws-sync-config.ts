// AWS Sync Configuration with environment variable defaults

export const SYNC_CONFIG = {
  // Minimum hours between syncs (Cost Explorer updates every 24h)
  MIN_SYNC_INTERVAL_HOURS: parseInt(process.env.MIN_SYNC_INTERVAL_HOURS || '6', 10),
  
  // Lock TTL in seconds (how long lock is held)
  SYNC_LOCK_TTL_SECONDS: parseInt(process.env.SYNC_LOCK_TTL_SECONDS || '600', 10), // 10 minutes
  
  // Maximum accounts to sync per run
  MAX_ACCOUNTS_PER_RUN: parseInt(process.env.MAX_ACCOUNTS_PER_RUN || '10', 10),
  
  // How many days of cost data to fetch
  AWS_SYNC_LOOKBACK_DAYS: parseInt(process.env.AWS_SYNC_LOOKBACK_DAYS || '30', 10),
}

