// Utility to generate fake demo data for /demo page
// This data is completely static and never touches the database

export interface DemoCostRecord {
  date: Date
  provider: string
  service: string
  amountEUR: number
  currency: string
}

export interface DemoTopService {
  provider: string
  service: string
  total: number
}

export interface DemoDailySeries {
  date: Date
  total: number
}

export interface DemoBudgetInfo {
  currentCosts: number
  budget: number
  percentage: number
  status: 'OK' | 'WARNING' | 'EXCEEDED'
}

// Generate realistic demo data
export function generateDemoData() {
  const providers = ['AWS', 'Azure', 'GCP', 'DigitalOcean', 'Vercel']
  const services = ['EC2', 'S3', 'Lambda', 'Storage', 'Compute', 'Database', 'CDN', 'Functions', 'Kubernetes', 'Load Balancer']
  const currencies = ['EUR', 'USD', 'EUR', 'EUR', 'EUR']

  // Generate 30 days of cost records
  const costRecords: DemoCostRecord[] = []
  const today = new Date()
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - (29 - i))
    
    // Generate 2-5 cost records per day
    const recordsPerDay = Math.floor(Math.random() * 4) + 2
    for (let j = 0; j < recordsPerDay; j++) {
      const provider = providers[Math.floor(Math.random() * providers.length)]
      const service = services[Math.floor(Math.random() * services.length)]
      const amountEUR = Math.round((Math.random() * 500 + 50) * 100) / 100
      const currency = currencies[Math.floor(Math.random() * currencies.length)]

      costRecords.push({
        date,
        provider,
        service,
        amountEUR,
        currency,
      })
    }
  }

  // Calculate totals
  const total7Days = costRecords
    .filter(c => {
      const daysAgo = (today.getTime() - c.date.getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo <= 7
    })
    .reduce((sum, c) => sum + c.amountEUR, 0)

  const total30Days = costRecords.reduce((sum, c) => sum + c.amountEUR, 0)

  // Top services
  const serviceTotals: Record<string, number> = {}
  costRecords.forEach(c => {
    const key = `${c.provider}:${c.service}`
    serviceTotals[key] = (serviceTotals[key] || 0) + c.amountEUR
  })

  const topServices: DemoTopService[] = Object.entries(serviceTotals)
    .map(([key, total]) => {
      const [provider, service] = key.split(':')
      return { provider, service, total }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Daily series
  const dailyTotals: Record<string, number> = {}
  costRecords.forEach(c => {
    const dateKey = c.date.toISOString().split('T')[0]
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + c.amountEUR
  })

  const dailySeries: DemoDailySeries[] = Object.entries(dailyTotals)
    .map(([date, total]) => ({
      date: new Date(date),
      total,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  // Budget info
  const budget = 10000
  const currentMonthCosts = total30Days
  const percentage = (currentMonthCosts / budget) * 100
  const status: 'OK' | 'WARNING' | 'EXCEEDED' = 
    percentage >= 100 ? 'EXCEEDED' :
    percentage >= 80 ? 'WARNING' :
    'OK'

  const budgetInfo: DemoBudgetInfo = {
    currentCosts: currentMonthCosts,
    budget,
    percentage,
    status,
  }

  return {
    costRecords,
    total7Days,
    total30Days,
    topServices,
    dailySeries,
    budgetInfo,
    cloudAccountsInfo: {
      total: 5,
      active: 4,
      pending: 1,
      disabled: 0,
    },
  }
}



