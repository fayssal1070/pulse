import { prisma } from './prisma'

export async function loadDemoData(orgId: string) {
  const now = new Date()
  
  // Generate realistic cost records for the last 30 days
  const costRecords = []
  const providers = ['AWS', 'GCP', 'Azure', 'DigitalOcean', 'Vercel']
  const services = {
    AWS: ['EC2', 'S3', 'Lambda', 'RDS', 'CloudFront'],
    GCP: ['Compute Engine', 'Cloud Storage', 'Cloud Functions', 'Cloud SQL', 'CDN'],
    Azure: ['Virtual Machines', 'Blob Storage', 'Functions', 'SQL Database', 'CDN'],
    DigitalOcean: ['Droplets', 'Spaces', 'Functions', 'Managed Databases'],
    Vercel: ['Functions', 'CDN', 'Edge Network'],
  }

  // Generate costs with some variation (higher on weekdays, lower on weekends)
  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - (30 - i))
    date.setHours(Math.floor(Math.random() * 24), 0, 0, 0)

    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseMultiplier = isWeekend ? 0.6 : 1.0

    // Generate 2-5 cost records per day
    const recordsPerDay = Math.floor(Math.random() * 4) + 2

    for (let j = 0; j < recordsPerDay; j++) {
      const provider = providers[Math.floor(Math.random() * providers.length)]
      const providerServices = services[provider as keyof typeof services] || ['Service']
      const service = providerServices[Math.floor(Math.random() * providerServices.length)]
      
      // Realistic cost ranges (EUR)
      let amount = 0
      if (provider === 'AWS') {
        amount = (Math.random() * 200 + 50) * baseMultiplier // 50-250 EUR
      } else if (provider === 'GCP') {
        amount = (Math.random() * 180 + 40) * baseMultiplier // 40-220 EUR
      } else if (provider === 'Azure') {
        amount = (Math.random() * 190 + 45) * baseMultiplier // 45-235 EUR
      } else if (provider === 'DigitalOcean') {
        amount = (Math.random() * 100 + 20) * baseMultiplier // 20-120 EUR
      } else {
        amount = (Math.random() * 80 + 15) * baseMultiplier // 15-95 EUR
      }

      costRecords.push({
        orgId,
        date,
        provider,
        service,
        amountEUR: Math.round(amount * 100) / 100,
        currency: 'EUR',
      })
    }
  }

  // Create cost records
  await prisma.costRecord.createMany({
    data: costRecords,
  })

  // Create 2 alert rules with realistic thresholds
  const totalCosts = costRecords.reduce((sum, r) => sum + r.amountEUR, 0)
  const avgDailyCost = totalCosts / 30
  const weeklyThreshold = avgDailyCost * 7 * 1.2 // 20% above average weekly
  const monthlyThreshold = totalCosts * 1.15 // 15% above total

  await prisma.alertRule.createMany({
    data: [
      {
        orgId,
        thresholdEUR: Math.round(weeklyThreshold * 100) / 100,
        windowDays: 7,
        triggered: false,
      },
      {
        orgId,
        thresholdEUR: Math.round(monthlyThreshold * 100) / 100,
        windowDays: 30,
        triggered: false,
      },
    ],
  })

  // Set a realistic monthly budget (slightly above current month total)
  const currentMonthTotal = costRecords
    .filter(r => {
      const recordDate = new Date(r.date)
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, r) => sum + r.amountEUR, 0)

  const budget = Math.round((currentMonthTotal * 1.1) * 100) / 100 // 10% above current month

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      budgetMonthlyEUR: budget,
      demoDataLoadedAt: now,
    },
  })

  return {
    costRecordsCount: costRecords.length,
    alertRulesCount: 2,
    budget,
  }
}

export async function resetDemoData(orgId: string) {
  // Delete all cost records
  await prisma.costRecord.deleteMany({
    where: { orgId },
  })

  // Delete all alert rules
  await prisma.alertRule.deleteMany({
    where: { orgId },
  })

  // Reset budget and demo flag
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      budgetMonthlyEUR: null,
      demoDataLoadedAt: null,
    },
  })
}

export async function hasDemoData(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { demoDataLoadedAt: true },
  })
  return org?.demoDataLoadedAt !== null
}

export async function hasAnyData(orgId: string): Promise<boolean> {
  const [costCount, alertCount] = await Promise.all([
    prisma.costRecord.count({ where: { orgId } }),
    prisma.alertRule.count({ where: { orgId } }),
  ])
  return costCount > 0 || alertCount > 0
}

