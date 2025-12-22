const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Créer 1 user (owner)
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: {
      email: 'owner@example.com',
      passwordHash,
    },
  })
  console.log('✅ User created:', user.email)

  // 2. Créer 1 organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
    },
  })
  console.log('✅ Organization created:', organization.name)

  // 3. Créer membership owner
  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      orgId: organization.id,
      role: 'owner',
    },
  })
  console.log('✅ Membership created:', membership.role)

  // 4. Créer 20 CostRecord répartis sur 30 jours
  const providers = ['AWS', 'Azure', 'GCP', 'DigitalOcean', 'Vercel']
  const services = ['EC2', 'S3', 'Lambda', 'Storage', 'Compute', 'Database', 'CDN', 'Functions']
  const currencies = ['EUR', 'USD', 'EUR', 'EUR', 'EUR'] // Principalement EUR

  const costRecords = []
  const today = new Date()
  
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30) // 0 à 29 jours
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    
    const provider = providers[Math.floor(Math.random() * providers.length)]
    const service = services[Math.floor(Math.random() * services.length)]
    const amountEUR = Math.round((Math.random() * 500 + 10) * 100) / 100 // 10 à 510 EUR
    const currency = currencies[Math.floor(Math.random() * currencies.length)]

    const costRecord = await prisma.costRecord.create({
      data: {
        orgId: organization.id,
        date,
        provider,
        service,
        amountEUR,
        currency,
      },
    })
    costRecords.push(costRecord)
  }
  console.log(`✅ ${costRecords.length} CostRecords created`)

  // 5. Créer 1 AlertRule avec seuil bas pour déclenchement
  // Seuil bas : 100 EUR sur 7 jours (facilement déclenchable avec 20 records)
  const alertRule = await prisma.alertRule.create({
    data: {
      orgId: organization.id,
      thresholdEUR: 100,
      windowDays: 7,
      triggered: false,
    },
  })
  console.log('✅ AlertRule created with threshold:', alertRule.thresholdEUR, 'EUR')

  console.log('🌱 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

