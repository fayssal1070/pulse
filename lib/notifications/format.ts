/**
 * Alert message formatting for email and Telegram
 */

import type { ActiveAlert } from '@/lib/alerts/engine'

const DASHBOARD_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pulse-sigma-eight.vercel.app'

/**
 * Format alert for email (HTML)
 */
export function formatAlertEmail(alert: ActiveAlert, orgName: string, isTest: boolean = false): { subject: string; html: string } {
  const statusEmoji = alert.status === 'CRITICAL' ? '🔴' : '⚠️'
  const statusText = alert.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING'
  const dashboardUrl = `${DASHBOARD_BASE_URL}/dashboard`
  const budgetsUrl = `${DASHBOARD_BASE_URL}/budgets`

  const subject = isTest
    ? `🧪 Test Alert from Pulse - ${orgName}`
    : `${statusEmoji} ${statusText}: ${alert.budgetName} - ${orgName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${alert.status === 'CRITICAL' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid ${alert.status === 'CRITICAL' ? '#dc2626' : '#f59e0b'}; }
        .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #111827; }
        .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${statusEmoji} ${statusText} Alert</h1>
        </div>
        <div class="content">
          ${isTest ? `
          <h2>🧪 Test Alert from Pulse</h2>
          <p>This is a test alert to verify your email notification settings. If you receive this email, your email notifications are working correctly.</p>
          <p><strong>Organization:</strong> ${orgName}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          ` : `
          <h2>${alert.budgetName}</h2>
          <p><strong>Organization:</strong> ${orgName}</p>
          <p><strong>Scope:</strong> ${alert.scopeName}</p>
          <p><strong>Period:</strong> ${alert.period}</p>
          
          <div class="metric">
            <div class="metric-label">Current Spend</div>
            <div class="metric-value">€${alert.currentSpend.toFixed(2)}</div>
          </div>
          
          <div class="metric">
            <div class="metric-label">Budget Limit</div>
            <div class="metric-value">€${alert.limit.toFixed(2)}</div>
          </div>
          
          <div class="metric">
            <div class="metric-label">Usage</div>
            <div class="metric-value">${alert.percentage.toFixed(1)}%</div>
          </div>

          <p><strong>Recommendation:</strong> Review your spending and consider adjusting your budget or optimizing costs.</p>
          `}

          <a href="${dashboardUrl}" class="button">View Dashboard</a>
          <a href="${budgetsUrl}" class="button" style="margin-left: 10px;">Manage Budgets</a>
        </div>
        <div class="footer">
          <p>This is an automated alert from Pulse. You can manage your notification preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

/**
 * Format alert for Telegram (plain text with HTML tags)
 */
export function formatAlertTelegram(alert: ActiveAlert, orgName: string, isTest: boolean = false): string {
  const statusEmoji = alert.status === 'CRITICAL' ? '🔴' : '⚠️'
  const statusText = alert.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING'
  const dashboardUrl = `${DASHBOARD_BASE_URL}/dashboard`

  if (isTest) {
    return `
🧪 <b>Test Alert from Pulse</b>

This is a test alert to verify your Telegram notification settings. If you receive this message, your Telegram notifications are working correctly.

<b>Organization:</b> ${orgName}
<b>Time:</b> ${new Date().toLocaleString()}
    `.trim()
  }

  return `
${statusEmoji} <b>${statusText} Alert</b>

<b>Budget:</b> ${alert.budgetName}
<b>Organization:</b> ${orgName}
<b>Scope:</b> ${alert.scopeName}
<b>Period:</b> ${alert.period}

<b>Current Spend:</b> €${alert.currentSpend.toFixed(2)}
<b>Budget Limit:</b> €${alert.limit.toFixed(2)}
<b>Usage:</b> ${alert.percentage.toFixed(1)}%

<b>Recommendation:</b> Review your spending and consider adjusting your budget or optimizing costs.

<a href="${dashboardUrl}">View Dashboard</a>
  `.trim()
}

