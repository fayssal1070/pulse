/**
 * CSV Template and Sample Data Generator
 * 
 * Required columns:
 * - date (YYYY-MM-DD)
 * - provider (AWS/GCP/Azure/Other)
 * - service (string)
 * - amountEUR (number)
 * - currency (EUR/USD)
 * 
 * Optional columns (not used by import but can be included):
 * - account (string)
 * - region (string)
 */

export function generateCSVTemplate(): string {
  const headers = ['date', 'provider', 'service', 'amountEUR', 'currency']
  return headers.join(',') + '\n'
}

export function generateSampleCSV(): string {
  const today = new Date()
  const records: string[] = []
  
  // Header
  records.push('date,provider,service,amountEUR,currency')
  
  // Generate 45 records (30-60 range) with realistic data
  // Mix of AWS, GCP, Azure over the last 30 days
  const services = {
    AWS: [
      { name: 'EC2', baseCost: 120, variance: 0.3 },
      { name: 'RDS', baseCost: 85, variance: 0.25 },
      { name: 'S3', baseCost: 25, variance: 0.4 },
      { name: 'Lambda', baseCost: 15, variance: 0.5 },
      { name: 'CloudFront', baseCost: 30, variance: 0.35 },
      { name: 'Route53', baseCost: 5, variance: 0.2 },
    ],
    GCP: [
      { name: 'Compute Engine', baseCost: 95, variance: 0.3 },
      { name: 'Cloud SQL', baseCost: 70, variance: 0.25 },
      { name: 'Cloud Storage', baseCost: 20, variance: 0.4 },
      { name: 'Cloud Functions', baseCost: 12, variance: 0.5 },
      { name: 'Load Balancing', baseCost: 18, variance: 0.35 },
    ],
    Azure: [
      { name: 'Virtual Machines', baseCost: 80, variance: 0.3 },
      { name: 'SQL Database', baseCost: 65, variance: 0.25 },
      { name: 'Blob Storage', baseCost: 18, variance: 0.4 },
      { name: 'Functions', baseCost: 10, variance: 0.5 },
      { name: 'App Service', baseCost: 22, variance: 0.35 },
    ],
  }
  
  // Generate records for last 30 days
  for (let day = 0; day < 30; day++) {
    const recordDate = new Date(today)
    recordDate.setDate(recordDate.getDate() - (29 - day))
    const dateStr = recordDate.toISOString().split('T')[0]
    
    // Add 1-2 records per day (average 1.5 = 45 total)
    const recordsPerDay = day % 2 === 0 ? 2 : 1
    
    for (let r = 0; r < recordsPerDay; r++) {
      // Rotate providers
      const providerIndex = (day + r) % 3
      const providers = ['AWS', 'GCP', 'Azure']
      const provider = providers[providerIndex]
      
      // Pick a random service for this provider
      const providerServices = services[provider as keyof typeof services]
      const service = providerServices[Math.floor(Math.random() * providerServices.length)]
      
      // Calculate cost with variance
      const variance = (Math.random() - 0.5) * 2 * service.variance
      const cost = service.baseCost * (1 + variance)
      
      // Round to 2 decimals
      const amountEUR = Math.round(cost * 100) / 100
      
      // Currency (mostly EUR, some USD)
      const currency = Math.random() > 0.1 ? 'EUR' : 'USD'
      
      records.push(`${dateStr},${provider},${service.name},${amountEUR},${currency}`)
    }
  }
  
  return records.join('\n')
}



