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
  errorCode?: 'AWS_COST_EXPLORER_NOT_READY' | 'AWS_COST_EXPLORER_NOT_ENABLED' | 'AWS_NO_COSTS'
  services: string[]
}

export interface AWSFetchMetadata {
  timePeriod: { start: string; end: string }
  metric: string
  totalFromAws: number
  currencyFromAws: string
  recordCount: number
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
 * Returns cost data and fetch metadata for debugging
 */
export async function fetchDailyCosts(
  roleArn: string,
  externalId: string,
  startDate: Date,
  endDate: Date
): Promise<{ costData: AWSCostData[]; fetchMetadata: AWSFetchMetadata }> {
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
  const metric = 'UnblendedCost'
  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDateStr,
      End: endDateStr,
    },
    Granularity: 'DAILY',
    Metrics: [metric],
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

  const isDebug = process.env.AWS_SYNC_DEBUG === '1' || process.env.AWS_SYNC_DEBUG === 'true'
  
  // Log request parameters
  if (isDebug) {
    console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
      stage: 'fetch_request',
      timePeriod: {
        start: startDateStr,
        end: endDateStr,
      },
      metric,
      granularity: 'DAILY',
    }))
  }

  let nextToken: string | undefined
  let firstResultLogged = false
  let hasAnyResults = false
  let sampleServices: Array<{ service: string; amount: string; unit: string }> = []

  do {
    const command = new GetCostAndUsageCommand({
      ...params,
      NextPageToken: nextToken,
    })

    const response = await costExplorerClient.send(command)

    if (!response.ResultsByTime || response.ResultsByTime.length === 0) {
      if (isDebug) {
        console.log('[AWS_SYNC_DEBUG] No ResultsByTime in response')
      }
      // If no ResultsByTime at all, this might indicate Cost Explorer is not ready
      // But we'll let the caller decide based on whether we got any data
      break
    }

    hasAnyResults = true

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
        
        // Improved parsing: handle comma/point, empty strings, NaN
        let amount: number
        if (!rawAmountString || rawAmountString.trim() === '') {
          amount = 0
        } else {
          // Replace comma with point for European number format
          const normalizedAmount = rawAmountString.replace(',', '.')
          amount = parseFloat(normalizedAmount)
          if (isNaN(amount)) {
            console.warn(`[AWS_SYNC_DEBUG] Failed to parse amount: "${rawAmountString}" for service ${service}`)
            amount = 0
          }
        }

        // Collect sample services for debug (max 3)
        if (isDebug && sampleServices.length < 3 && rawAmountString !== '0') {
          sampleServices.push({
            service,
            amount: rawAmountString,
            unit: rawUnit,
          })
        }

        // Debug: Log raw values (only for first few or non-zero)
        if (isDebug && (sampleServices.length <= 3 || amount > 0)) {
          console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
            date,
            service,
            rawAmountString,
            rawUnit,
            parsedAmount: amount,
            isNaN: isNaN(amount),
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
  const finalTotalAmount = costData.reduce((sum, r) => sum + r.amount, 0)
  if (isDebug) {
    console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
      stage: 'fetch_complete',
      finalTotalRecords: costData.length,
      finalTotalAmount,
      currency: costData.length > 0 ? costData[0].currency : 'USD',
      services: [...new Set(costData.map(r => r.service))],
      hasAnyResults,
      sampleServices: sampleServices.slice(0, 3),
    }))
  }

  // Return fetch metadata for debug endpoint
  return {
    costData,
    fetchMetadata: {
      timePeriod: { start: startDateStr, end: endDateStr },
      metric,
      totalFromAws: finalTotalAmount,
      currencyFromAws: costData.length > 0 ? costData[0].currency : 'USD',
      recordCount: costData.length,
    },
  }

  // If we got ResultsByTime but no cost data, it means no costs (not a pending state)
  // If we got no ResultsByTime at all, it might indicate Cost Explorer is not ready
  // But we can't distinguish here, so we return empty array and let the caller check

  return {
    costData,
    fetchMetadata: {
      timePeriod: { start: startDateStr, end: endDateStr },
      metric,
      totalFromAws: finalTotalAmount,
      currencyFromAws: costData.length > 0 ? costData[0].currency : 'USD',
      recordCount: costData.length,
    },
  }
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

  const result = await fetchDailyCosts(roleArn, externalId, startOfMonth, endOfMonth)
  return result.costData
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

    const fetchResult = await fetchDailyCosts(roleArn, externalId, startDate, endDate)
    const costData = fetchResult.costData

    // If no cost data, it means no costs (not an error, not pending)
    if (costData.length === 0) {
      return {
        success: true,
        recordsCount: 0,
        totalAmount: 0,
        errorCode: 'AWS_NO_COSTS',
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
    
    // Detect specific AWS Cost Explorer errors
    let errorCode: 'AWS_COST_EXPLORER_NOT_READY' | 'AWS_COST_EXPLORER_NOT_ENABLED' | undefined
    
    if (errorMessage.includes('User not enabled for cost explorer access') ||
        errorMessage.includes('Cost Explorer is not enabled')) {
      errorCode = 'AWS_COST_EXPLORER_NOT_ENABLED'
    } else if (errorMessage.includes('data is not available yet') ||
               errorMessage.includes('Cost Explorer initialization') ||
               errorMessage.includes('not ready')) {
      errorCode = 'AWS_COST_EXPLORER_NOT_READY'
    }
    
    return {
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: errorMessage,
      errorCode,
      services: [],
    }
  }
}

