import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'

export interface AWSCostData {
  date: string // YYYY-MM-DD
  service: string
  amount: number
  currency: string
}

export interface AWSSyncResult {
  success: boolean
  recordsCount: number
  totalAmount: number
  error?: string
  services: string[]
}

/**
 * Assume an AWS role and return credentials
 */
async function assumeRole(roleArn: string, externalId: string) {
  const stsClient = new STSClient({ region: 'us-east-1' })

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `pulse-cost-sync-${Date.now()}`,
    ExternalId: externalId,
    DurationSeconds: 3600, // 1 hour
  })

  const response = await stsClient.send(command)

  if (!response.Credentials) {
    throw new Error('Failed to assume role: No credentials returned')
  }

  return {
    accessKeyId: response.Credentials.AccessKeyId!,
    secretAccessKey: response.Credentials.SecretAccessKey!,
    sessionToken: response.Credentials.SessionToken!,
  }
}

/**
 * Fetch daily costs for the last 30 days grouped by service
 */
export async function fetchDailyCosts(
  roleArn: string,
  externalId: string,
  startDate: Date,
  endDate: Date
): Promise<AWSCostData[]> {
  // Assume role
  const credentials = await assumeRole(roleArn, externalId)

  // Create Cost Explorer client with assumed role credentials
  const costExplorerClient = new CostExplorerClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })

  const costData: AWSCostData[] = []

  // Format dates for Cost Explorer API (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const startDateStr = formatDate(startDate)
  const endDateStr = formatDate(endDate)

  // Fetch cost and usage data
  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDateStr,
      End: endDateStr,
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
      {
        Type: 'DIMENSION',
        Key: 'USAGE_TYPE',
      },
    ],
  }

  const isDebug = process.env.AWS_SYNC_DEBUG === '1'
  let nextToken: string | undefined
  let firstResultLogged = false

  do {
    const command = new GetCostAndUsageCommand({
      ...params,
      NextPageToken: nextToken,
    })

    const response = await costExplorerClient.send(command)

    if (!response.ResultsByTime) {
      if (isDebug) {
        console.log('[AWS_SYNC_DEBUG] No ResultsByTime in response')
      }
      break
    }

    // Debug: Log first result structure
    if (isDebug && !firstResultLogged && response.ResultsByTime.length > 0) {
      const firstResult = response.ResultsByTime[0]
      console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
        metric: 'UnblendedCost',
        firstResultTimePeriod: firstResult.TimePeriod,
        firstResultTotal: firstResult.Total ? {
          UnblendedCost: {
            Amount: firstResult.Total.UnblendedCost?.Amount,
            Unit: firstResult.Total.UnblendedCost?.Unit,
          },
        } : null,
        firstGroup: firstResult.Groups && firstResult.Groups.length > 0 ? {
          Keys: firstResult.Groups[0].Keys,
          Metrics: firstResult.Groups[0].Metrics ? {
            UnblendedCost: {
              Amount: firstResult.Groups[0].Metrics.UnblendedCost?.Amount,
              Unit: firstResult.Groups[0].Metrics.UnblendedCost?.Unit,
            },
          } : null,
        } : null,
        totalResultsByTime: response.ResultsByTime.length,
      }))
      firstResultLogged = true
    }

    let recordsWithAmountGreaterThanZero = 0
    let totalRawAmount = 0

    for (const result of response.ResultsByTime) {
      const date = result.TimePeriod?.Start
      if (!date) continue

      if (!result.Groups) continue

      for (const group of result.Groups) {
        const service = group.Keys?.[0] || 'Unknown'
        const rawAmountString = group.Metrics?.UnblendedCost?.Amount || '0'
        const rawUnit = group.Metrics?.UnblendedCost?.Unit || 'USD'
        const amount = parseFloat(rawAmountString)

        // Debug: Log raw values
        if (isDebug) {
          console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
            date,
            service,
            rawAmountString,
            rawUnit,
            parsedAmount: amount,
            amountGreaterThanZero: amount > 0,
          }))
        }

        if (amount > 0) {
          recordsWithAmountGreaterThanZero++
          totalRawAmount += amount
          costData.push({
            date,
            service,
            amount,
            currency: rawUnit,
          })
        }
      }
    }

    // Debug: Log summary for this page
    if (isDebug) {
      console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
        page: nextToken ? 'next' : 'first',
        recordsWithAmountGreaterThanZero,
        totalRawAmount,
        totalCostDataSoFar: costData.length,
      }))
    }

    nextToken = response.NextPageToken
  } while (nextToken)

  // Debug: Log final summary
  if (isDebug) {
    console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
      finalTotalRecords: costData.length,
      finalTotalAmount: costData.reduce((sum, r) => sum + r.amount, 0),
      services: [...new Set(costData.map(r => r.service))],
    }))
  }

  return costData
}

/**
 * Fetch month-to-date costs grouped by service
 */
export async function fetchMTDCosts(
  roleArn: string,
  externalId: string
): Promise<AWSCostData[]> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return fetchDailyCosts(roleArn, externalId, startOfMonth, endOfMonth)
}

/**
 * Sync AWS costs for an organization
 */
export async function syncAWSCosts(
  roleArn: string,
  externalId: string,
  orgId: string
): Promise<AWSSyncResult> {
  try {
    // Fetch last 30 days of daily costs
    const endDate = new Date()
    endDate.setHours(0, 0, 0, 0) // Start of today
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 30) // 30 days ago

    const costData = await fetchDailyCosts(roleArn, externalId, startDate, endDate)

    if (costData.length === 0) {
      return {
        success: true,
        recordsCount: 0,
        totalAmount: 0,
        services: [],
      }
    }

    // Group by date and service to get daily totals per service
    const dailyTotals = new Map<string, { service: string; amount: number; currency: string }>()

    for (const record of costData) {
      const key = `${record.date}:${record.service}`
      const existing = dailyTotals.get(key)

      if (existing) {
        existing.amount += record.amount
      } else {
        dailyTotals.set(key, {
          service: record.service,
          amount: record.amount,
          currency: record.currency,
        })
      }
    }

    // Convert to array and calculate totals
    const records: Array<{
      orgId: string
      date: Date
      provider: string
      service: string
      amountEUR: number
      currency: string
    }> = []

    let totalAmount = 0
    const services = new Set<string>()

    for (const [key, data] of dailyTotals) {
      const [dateStr] = key.split(':')
      const date = new Date(dateStr + 'T00:00:00Z')

      // Convert to EUR if needed (simple 1:1 for now, can be enhanced with real exchange rates)
      const amountEUR = data.currency === 'EUR' ? data.amount : data.amount * 0.92 // Approx USD to EUR

      records.push({
        orgId,
        date,
        provider: 'AWS',
        service: data.service,
        amountEUR: Math.round(amountEUR * 100) / 100, // Round to 2 decimals
        currency: data.currency,
      })

      totalAmount += amountEUR
      services.add(data.service)
    }

    return {
      success: true,
      recordsCount: records.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      services: Array.from(services),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: errorMessage,
      services: [],
    }
  }
}

