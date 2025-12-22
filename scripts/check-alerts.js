require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAlerts() {
  console.log('Checking alerts...')

  // Récupérer toutes les organisations
  const organizations = await prisma.organization.findMany({
    include: {
      alertRules: true,
    },
  })

  for (const org of organizations) {
    for (const rule of org.alertRules) {
      // Calculer le total des windowDays derniers jours
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - rule.windowDays)
      startDate.setHours(0, 0, 0, 0)

      const result = await prisma.costRecord.aggregate({
        where: {
          orgId: org.id,
          date: { gte: startDate },
        },
        _sum: {
          amountEUR: true,
        },
      })

      const total = result._sum.amountEUR || 0

      // Si dépassement et pas déjà triggered
      if (total > rule.thresholdEUR && !rule.triggered) {
        await prisma.alertRule.update({
          where: { id: rule.id },
          data: {
            triggered: true,
            triggeredAt: new Date(),
          },
        })

        console.log(
          `✓ Alert rule triggered for "${org.name}": ${total.toFixed(2)} EUR > ${rule.thresholdEUR.toFixed(2)} EUR (${rule.windowDays} days)`
        )
      } else if (total > rule.thresholdEUR && rule.triggered) {
        console.log(
          `  Alert rule already triggered for "${org.name}": ${total.toFixed(2)} EUR > ${rule.thresholdEUR.toFixed(2)} EUR`
        )
      } else {
        console.log(
          `  Alert rule OK for "${org.name}": ${total.toFixed(2)} EUR <= ${rule.thresholdEUR.toFixed(2)} EUR (${rule.windowDays} days)`
        )
      }
    }
  }

  console.log('Done checking alerts.')
}

checkAlerts()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

