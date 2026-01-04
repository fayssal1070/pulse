// Static demo dataset with realistic cloud cost data
// This dataset is used for the /demo page to show a credible demo experience

export interface DemoCloudAccount {
  id: string
  provider: 'AWS' | 'GCP' | 'Azure'
  accountName: string
  accountIdentifier: string
  status: 'active' | 'pending' | 'disabled'
}

export interface DemoCostRecord {
  date: Date
  provider: string
  service: string
  amountEUR: number
  currency: string
}

export interface DemoBudget {
  id: string
  name: string
  monthlyLimitEUR: number
  currentSpendEUR: number
  percentage: number
  status: 'OK' | 'WARNING' | 'EXCEEDED'
}

export interface DemoAlert {
  id: string
  type: 'threshold' | 'anomaly' | 'spike' | 'burn_rate'
  title: string
  message: string
  severity: 'high' | 'medium' | 'low'
  triggeredAt: Date
  resolved: boolean
}

// 3 Cloud Accounts
export const DEMO_CLOUD_ACCOUNTS: DemoCloudAccount[] = [
  {
    id: 'demo-aws-1',
    provider: 'AWS',
    accountName: 'Production AWS',
    accountIdentifier: '123456789012',
    status: 'active',
  },
  {
    id: 'demo-gcp-1',
    provider: 'GCP',
    accountName: 'Development GCP',
    accountIdentifier: 'gcp-project-dev-123',
    status: 'active',
  },
  {
    id: 'demo-azure-1',
    provider: 'Azure',
    accountName: 'Staging Azure',
    accountIdentifier: 'azure-sub-456',
    status: 'active',
  },
]

// 12 months of cost data with realistic trend (gradual increase)
// Base month: January 2024, current: December 2024
export function getDemoCostRecords(): DemoCostRecord[] {
  const records: DemoCostRecord[] = []
  const baseDate = new Date(2024, 0, 1) // January 2024
  
  // Services with realistic distribution
  const awsServices = [
    { name: 'EC2', baseCost: 1200, variance: 0.2 },
    { name: 'RDS', baseCost: 450, variance: 0.15 },
    { name: 'S3', baseCost: 180, variance: 0.3 },
    { name: 'Lambda', baseCost: 95, variance: 0.4 },
    { name: 'CloudFront', baseCost: 120, variance: 0.25 },
    { name: 'Route53', baseCost: 15, variance: 0.1 },
  ]
  
  const gcpServices = [
    { name: 'Compute Engine', baseCost: 850, variance: 0.2 },
    { name: 'Cloud SQL', baseCost: 320, variance: 0.15 },
    { name: 'Cloud Storage', baseCost: 150, variance: 0.3 },
    { name: 'Cloud Functions', baseCost: 75, variance: 0.4 },
    { name: 'Load Balancing', baseCost: 90, variance: 0.25 },
  ]
  
  const azureServices = [
    { name: 'Virtual Machines', baseCost: 680, variance: 0.2 },
    { name: 'SQL Database', baseCost: 280, variance: 0.15 },
    { name: 'Blob Storage', baseCost: 140, variance: 0.3 },
    { name: 'Functions', baseCost: 65, variance: 0.4 },
    { name: 'App Service', baseCost: 110, variance: 0.25 },
  ]
  
  // Generate 12 months with trend (5-8% monthly growth)
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(baseDate)
    monthDate.setMonth(monthDate.getMonth() + month)
    const growthFactor = 1 + (month * 0.06) // 6% monthly growth
    
    // AWS services (2-3 records per month)
    for (const service of awsServices) {
      const variance = (Math.random() - 0.5) * 2 * service.variance
      const amount = service.baseCost * growthFactor * (1 + variance)
      records.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1),
        provider: 'AWS',
        service: service.name,
        amountEUR: Math.round(amount * 100) / 100,
        currency: 'EUR',
      })
    }
    
    // GCP services (1-2 records per month)
    for (let i = 0; i < 3; i++) {
      const service = gcpServices[Math.floor(Math.random() * gcpServices.length)]
      const variance = (Math.random() - 0.5) * 2 * service.variance
      const amount = service.baseCost * growthFactor * (1 + variance)
      records.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1),
        provider: 'GCP',
        service: service.name,
        amountEUR: Math.round(amount * 100) / 100,
        currency: 'EUR',
      })
    }
    
    // Azure services (1-2 records per month)
    for (let i = 0; i < 2; i++) {
      const service = azureServices[Math.floor(Math.random() * azureServices.length)]
      const variance = (Math.random() - 0.5) * 2 * service.variance
      const amount = service.baseCost * growthFactor * (1 + variance)
      records.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1),
        provider: 'Azure',
        service: service.name,
        amountEUR: Math.round(amount * 100) / 100,
        currency: 'EUR',
      })
    }
  }
  
  // Sort by date
  return records.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// 3 Monthly Budgets
export const DEMO_BUDGETS: DemoBudget[] = [
  {
    id: 'demo-budget-prod',
    name: 'Production Environment',
    monthlyLimitEUR: 15000,
    currentSpendEUR: 14250,
    percentage: 95,
    status: 'WARNING',
  },
  {
    id: 'demo-budget-dev',
    name: 'Development Environment',
    monthlyLimitEUR: 5000,
    currentSpendEUR: 3850,
    percentage: 77,
    status: 'OK',
  },
  {
    id: 'demo-budget-staging',
    name: 'Staging Environment',
    monthlyLimitEUR: 3000,
    currentSpendEUR: 3150,
    percentage: 105,
    status: 'EXCEEDED',
  },
]

// 5 Alerts
export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: 'demo-alert-1',
    type: 'threshold',
    title: 'Production budget threshold exceeded',
    message: 'Production environment spending has exceeded 90% of monthly budget (€14,250 / €15,000)',
    severity: 'high',
    triggeredAt: new Date(2024, 11, 15, 14, 30), // Dec 15, 2024
    resolved: false,
  },
  {
    id: 'demo-alert-2',
    type: 'spike',
    title: 'Unusual spending spike detected',
    message: 'AWS EC2 costs increased by 45% compared to previous day (€1,850 vs €1,275)',
    severity: 'high',
    triggeredAt: new Date(2024, 11, 12, 9, 15), // Dec 12, 2024
    resolved: false,
  },
  {
    id: 'demo-alert-3',
    type: 'burn_rate',
    title: 'High burn rate detected',
    message: 'Staging environment is consuming budget 40% faster than expected. Projected to exceed limit by month end.',
    severity: 'medium',
    triggeredAt: new Date(2024, 11, 10, 16, 45), // Dec 10, 2024
    resolved: false,
  },
  {
    id: 'demo-alert-4',
    type: 'anomaly',
    title: 'Anomalous GCP Compute Engine usage',
    message: 'GCP Compute Engine costs are 30% above 30-day average. Possible resource leak detected.',
    severity: 'medium',
    triggeredAt: new Date(2024, 11, 8, 11, 20), // Dec 8, 2024
    resolved: true,
  },
  {
    id: 'demo-alert-5',
    type: 'threshold',
    title: 'Staging budget exceeded',
    message: 'Staging environment has exceeded monthly budget limit (€3,150 / €3,000)',
    severity: 'high',
    triggeredAt: new Date(2024, 11, 5, 8, 0), // Dec 5, 2024
    resolved: false,
  },
]

// Calculate monthly totals for trend
export function getMonthlyTrend() {
  const records = getDemoCostRecords()
  const monthlyTotals: Record<string, number> = {}
  
  records.forEach(record => {
    const monthKey = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + record.amountEUR
  })
  
  return Object.entries(monthlyTotals)
    .map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// Get current month total
export function getCurrentMonthTotal(): number {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const trend = getMonthlyTrend()
  const current = trend.find(t => t.month === currentMonth)
  return current ? current.total : trend[trend.length - 1]?.total || 0
}

// Get top 5 cost drivers
export function getTopCostDrivers(limit: number = 5) {
  const records = getDemoCostRecords()
  const serviceTotals: Record<string, number> = {}
  
  records.forEach(record => {
    const key = `${record.provider}:${record.service}`
    serviceTotals[key] = (serviceTotals[key] || 0) + record.amountEUR
  })
  
  return Object.entries(serviceTotals)
    .map(([key, total]) => {
      const [provider, service] = key.split(':')
      return { provider, service, total: Math.round(total * 100) / 100 }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}





