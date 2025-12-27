require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function sendTelegramMessage(botToken, chatId, message) {
  try {
    const https = require('https')
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    // Use Node.js https module with proper TLS handling (no NODE_TLS_REJECT_UNAUTHORIZED needed)
    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    })

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      // Let Node.js use system CA certificates (default behavior)
    }

    return new Promise((resolve) => {
      const req = https.request(url, options, (res) => {
        let responseData = ''
        res.on('data', (chunk) => {
          responseData += chunk
        })
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true)
          } else {
            try {
              const error = JSON.parse(responseData)
              console.error('Telegram API error:', error)
            } catch {
              console.error('Telegram API error:', responseData)
            }
            resolve(false)
          }
        })
      })

      req.on('error', (error) => {
        console.error('Telegram send error:', error.message)
        resolve(false)
      })

      req.write(data)
      req.end()
    })
  } catch (error) {
    console.error('Telegram send error:', error.message)
    return false
  }
}

function formatAlertMessage(orgName, threshold, windowDays, currentTotal) {
  return `🚨 <b>Alert Triggered</b>

Organization: ${orgName}
Threshold: ${threshold.toFixed(2)} EUR (${windowDays} days)
Current total: ${currentTotal.toFixed(2)} EUR

The cost threshold has been exceeded.`
}

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
      // Sauvegarder l'état précédent
      const wasTriggered = rule.triggered

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

        // Envoyer notification Telegram si configuré et passage de false->true
        if (org.telegramBotToken && org.telegramChatId && !wasTriggered) {
          try {
            const message = formatAlertMessage(org.name, rule.thresholdEUR, rule.windowDays, total)
            const sent = await sendTelegramMessage(org.telegramBotToken, org.telegramChatId, message)
            if (sent) {
              console.log(`📱 Telegram notification sent to ${org.name}`)
            } else {
              console.log(`⚠️ Failed to send Telegram notification to ${org.name} (non-fatal)`)
            }
          } catch (error) {
            console.log(`⚠️ Telegram notification error for ${org.name} (non-fatal):`, error.message)
          }
        }
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

