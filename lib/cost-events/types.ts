/**
 * CostEvent types and interfaces
 */

export type CostEventSource = 'AWS' | 'AI'

export type CostEventProvider =
  | 'aws'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'cohere'
  | 'mistral'
  | 'other'

export type CostCategory = 'Compute' | 'Storage' | 'AI' | 'Network' | 'Database' | 'Other'

export interface CostEventDimensions {
  userId?: string
  teamId?: string
  projectId?: string
  appId?: string
  clientId?: string
  model?: string
  taskType?: string
  [key: string]: string | undefined
}

export interface CostEventRawRef {
  // AWS CUR fields
  lineItemId?: string
  billInvoiceId?: string
  timeInterval?: string
  usageAccountId?: string
  payerAccountId?: string
  resourceId?: string
  arn?: string
  // AI fields
  requestId?: string
  [key: string]: string | undefined
}

export interface CostEventFilters {
  orgId: string
  source?: CostEventSource
  provider?: CostEventProvider
  startDate?: Date
  endDate?: Date
  projectId?: string
  teamId?: string
  userId?: string
  appId?: string
  clientId?: string
  model?: string
  service?: string
  costCategory?: CostCategory
}

export interface CostEventGroupBy {
  source?: boolean
  provider?: boolean
  service?: boolean
  projectId?: boolean
  teamId?: boolean
  userId?: boolean
  appId?: boolean
  clientId?: boolean
  model?: boolean
  costCategory?: boolean
  date?: boolean // Group by day
}

export interface CostEventAggregation {
  totalAmountEur: number
  totalAmountUsd: number | null
  eventCount: number
  groupBy?: Record<string, string | null>
}

export interface CostKPIs {
  // AI costs
  aiCostToday: number
  aiCostMTD: number
  aiCostLastMonth: number
  aiCostMoMDelta: number // Delta vs last month
  aiCostMoMDeltaPercent: number

  // AWS costs
  awsCostToday: number
  awsCostMTD: number
  awsCostLastMonth: number
  awsCostMoMDelta: number
  awsCostMoMDeltaPercent: number

  // Combined
  totalCostToday: number
  totalCostMTD: number
  totalCostLastMonth: number
  totalCostMoMDelta: number
  totalCostMoMDeltaPercent: number
}

export interface TopConsumer {
  id: string
  name: string
  type: 'user' | 'team' | 'project' | 'app' | 'service' | 'model'
  amountEur: number
  amountUsd: number | null
  eventCount: number
  percentage: number // Percentage of total
}

