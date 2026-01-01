import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fonction utilitaire pour envoyer un message Telegram
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Telegram API error: ${response.status}`, errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

// Formater un message d'alerte
function formatAlertMessage(
  orgName: string,
  thresholdEUR: number,
  totalEUR: number,
  lookbackDays: number
): string {
  return `🚨 <b>Alert Triggered</b>

<b>Organization:</b> ${orgName}
<b>Rule:</b> ${thresholdEUR.toFixed(2)} EUR threshold
<b>Amount:</b> ${totalEUR.toFixed(2)} EUR
<b>Period:</b> Last ${lookbackDays} days`
}

async function checkAlerts() {
  console.log('Checking alerts...')

  // Récupérer toutes les organisations avec leur config Telegram
  const organizations = await prisma.organization.findMany({
    include: {
      alertRules: true,
    },
  })

  for (const org of organizations) {
    for (const rule of org.alertRules) {
      // Calculer le total des lookbackDays derniers jours (ou utiliser 7 par défaut pour compatibilité)
      const startDate = new Date()
      const periodDays = rule.lookbackDays || 7
      startDate.setDate(startDate.getDate() - periodDays)
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

      // Si dépassement et pas déjà triggered (cooldown check)
      const shouldTrigger = rule.thresholdEUR && total > rule.thresholdEUR && rule.enabled
      const isInCooldown = rule.lastTriggeredAt && 
        (new Date().getTime() - rule.lastTriggeredAt.getTime()) < (rule.cooldownHours * 60 * 60 * 1000)

      if (shouldTrigger && !isInCooldown) {
        await prisma.alertRule.update({
          where: { id: rule.id },
          data: {
            lastTriggeredAt: new Date(),
          },
        })

        console.log(
          `✓ Alert rule triggered for "${org.name}": ${total.toFixed(2)} EUR > ${rule.thresholdEUR?.toFixed(2) || 'N/A'} EUR (${periodDays} days)`
        )

        // Envoyer notification Telegram
        if (org.telegramBotToken && org.telegramChatId && rule.thresholdEUR !== null) {
          const message = formatAlertMessage(
            org.name,
            rule.thresholdEUR,
            total,
            periodDays
          )
          const sent = await sendTelegramMessage(
            org.telegramBotToken,
            org.telegramChatId,
            message
          )
          if (sent) {
            console.log(`  ✓ Telegram notification sent for "${org.name}"`)
          } else {
            console.log(`  ⚠ Failed to send Telegram notification for "${org.name}"`)
          }
        } else {
          console.log(`  ℹ Telegram not configured for "${org.name}", skipping notification`)
        }
      } else if (rule.thresholdEUR && total > rule.thresholdEUR && isInCooldown) {
        console.log(
          `  Alert rule in cooldown for "${org.name}": ${total.toFixed(2)} EUR > ${rule.thresholdEUR.toFixed(2)} EUR`
        )
      } else {
        console.log(
          `  Alert rule OK for "${org.name}": ${total.toFixed(2)} EUR <= ${rule.thresholdEUR?.toFixed(2) || 'N/A'} EUR (${periodDays} days)`
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
