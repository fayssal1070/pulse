// Try .env.local first, then fall back to .env
require('dotenv').config({ path: '.env.local' })
require('dotenv').config() // This will load .env if .env.local doesn't exist
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

// Pool PostgreSQL basé sur DATABASE_URL
const connectionString = process.env.DATABASE_URL || ''
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

const pool = new Pool({
  connectionString,
  ...(isLocal ? {} : {
    ssl: {
      rejectUnauthorized: false, // Pour Supabase pooler
    },
  }),
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
})

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Créer ou mettre à jour 1 user (owner)
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: { passwordHash },
    create: {
      email: 'owner@example.com',
      passwordHash,
    },
  })
  console.log('✅ User created/updated:', user.email)

  // 2. Créer ou mettre à jour 1 organization
  let organization = await prisma.organization.findFirst({
    where: { name: 'Acme Corp' },
  })
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Acme Corp',
      },
    })
    console.log('✅ Organization created:', organization.name)
  } else {
    console.log('✅ Organization already exists:', organization.name)
  }

  // 3. Créer ou mettre à jour membership owner
  const membership = await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: organization.id,
      },
    },
    update: { role: 'owner' },
    create: {
      userId: user.id,
      orgId: organization.id,
      role: 'owner',
    },
  })
  console.log('✅ Membership created/updated:', membership.role)

  // 4. Supprimer les anciens CostRecords et créer 20 nouveaux répartis sur 30 jours
  const existingCostRecords = await prisma.costRecord.count({
    where: { orgId: organization.id },
  })
  if (existingCostRecords > 0) {
    await prisma.costRecord.deleteMany({
      where: { orgId: organization.id },
    })
    console.log(`🗑️  Deleted ${existingCostRecords} existing CostRecords`)
  }

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

  // 5. Créer ou mettre à jour 1 AlertRule avec seuil bas pour déclenchement
  // Seuil bas : 100 EUR sur 7 jours (facilement déclenchable avec 20 records)
  const existingAlertRule = await prisma.alertRule.findFirst({
    where: { orgId: organization.id },
  })
  let alertRule
  if (existingAlertRule) {
    alertRule = await prisma.alertRule.update({
      where: { id: existingAlertRule.id },
      data: {
        thresholdEUR: 100,
        windowDays: 7,
        triggered: false,
        triggeredAt: null,
      },
    })
    console.log('✅ AlertRule updated with threshold:', alertRule.thresholdEUR, 'EUR')
  } else {
    alertRule = await prisma.alertRule.create({
      data: {
        orgId: organization.id,
        thresholdEUR: 100,
        windowDays: 7,
        triggered: false,
      },
    })
    console.log('✅ AlertRule created with threshold:', alertRule.thresholdEUR, 'EUR')
  }

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

