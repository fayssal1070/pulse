/**
 * AWS Cost and Usage Report (CUR) ingestion
 */

import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import { createHash } from 'crypto'
import { Readable } from 'stream'
import { prisma } from '@/lib/prisma'
import { createS3Client, downloadS3Object, listCurFiles, type S3Config } from './s3'
import type { CostEventDimensions, CostEventRawRef } from '@/lib/cost-events/types'

export interface CurIngestionConfig {
  orgId: string
  bucket: string
  prefix?: string
  region?: string
  assumeRoleArn?: string
  externalId?: string
  batchId: string
}

export interface CurIngestionResult {
  batchId: string
  objectsProcessed: number
  rowsParsed: number
  eventsUpserted: number
  errorsCount: number
  sampleError: string | null
}

/**
 * Parse CSV line from CUR
 */
function parseCurLine(line: string, headers: string[]): Record<string, string> | null {
  if (!line || line.trim().length === 0) {
    return null
  }

  // Simple CSV parsing (handle quoted fields)
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim()) // Last value

  if (values.length !== headers.length) {
    return null // Skip malformed lines
  }

  const record: Record<string, string> = {}
  for (let i = 0; i < headers.length; i++) {
    record[headers[i]] = values[i] || ''
  }

  return record
}

/**
 * Generate unique hash for deduplication
 */
function generateUniqueHash(
  orgId: string,
  lineItemId: string,
  usageStartDate: string,
  usageAccountId: string,
  productCode: string,
  unblendedCost: string,
  resourceId: string
): string {
  const hash = createHash('sha256')
  hash.update(`${orgId}|${lineItemId}|${usageStartDate}|${usageAccountId}|${productCode}|${unblendedCost}|${resourceId || ''}`)
  return hash.digest('hex')
}

/**
 * Normalize CUR line to CostEvent
 */
function normalizeCurLineToCostEvent(
  orgId: string,
  line: Record<string, string>,
  batchId: string
): {
  costEvent: any
  uniqueHash: string
} | null {
  try {
    // Required fields
    const lineItemId = line['identity/LineItemId'] || line['LineItemId'] || ''
    const usageStartDate = line['lineItem/UsageStartDate'] || line['UsageStartDate'] || ''
    const usageAccountId = line['lineItem/UsageAccountId'] || line['UsageAccountId'] || ''
    const productCode = line['lineItem/ProductCode'] || line['ProductCode'] || ''
    const unblendedCost = line['lineItem/UnblendedCost'] || line['UnblendedCost'] || ''
    const currencyCode = line['lineItem/CurrencyCode'] || line['CurrencyCode'] || 'USD'
    const service = line['lineItem/ProductName'] || line['ProductName'] || productCode
    const resourceId = line['lineItem/ResourceId'] || line['ResourceId'] || ''

    if (!lineItemId || !usageStartDate || !unblendedCost) {
      return null // Skip invalid lines
    }

    // Parse date
    const occurredAt = new Date(usageStartDate)
    if (isNaN(occurredAt.getTime())) {
      return null
    }

    // Parse cost
    const amountUsd = parseFloat(unblendedCost)
    if (isNaN(amountUsd) || amountUsd <= 0) {
      return null // Skip zero/negative costs
    }

    // Convert to EUR (MVP: use fixed rate 0.92, or store USD only)
    // For MVP, we'll store USD and calculate EUR later if needed
    const amountEur = currencyCode === 'EUR' ? amountUsd : amountUsd * 0.92 // Approximate

    // Extract dimensions from tags
    const dimensions: CostEventDimensions = {}
    const tags: Record<string, string> = {}

    // Parse resource tags (format: user:TagKey1, user:TagValue1, user:TagKey2, user:TagValue2, ...)
    for (const [key, value] of Object.entries(line)) {
      if (key.startsWith('resourceTags/user:') || key.startsWith('resourceTags/aws:')) {
        const tagKey = key.replace(/^resourceTags\/(user|aws):/, '')
        tags[tagKey] = value || ''
      } else if (key.startsWith('resourceTags/')) {
        const tagKey = key.replace(/^resourceTags\//, '')
        tags[tagKey] = value || ''
      }
    }

    // Map common tags to dimensions
    if (tags['Project'] || tags['project']) {
      dimensions.projectId = tags['Project'] || tags['project']
    }
    if (tags['Team'] || tags['team']) {
      dimensions.teamId = tags['Team'] || tags['team']
    }
    if (tags['User'] || tags['user']) {
      dimensions.userId = tags['User'] || tags['user']
    }
    if (tags['App'] || tags['app']) {
      dimensions.appId = tags['App'] || tags['app']
    }
    if (tags['Client'] || tags['client']) {
      dimensions.clientId = tags['Client'] || tags['client']
    }

    // Determine cost category
    let costCategory = 'Other'
    const serviceLower = service.toLowerCase()
    if (serviceLower.includes('compute') || serviceLower.includes('ec2') || serviceLower.includes('lambda')) {
      costCategory = 'Compute'
    } else if (serviceLower.includes('storage') || serviceLower.includes('s3') || serviceLower.includes('ebs')) {
      costCategory = 'Storage'
    } else if (serviceLower.includes('database') || serviceLower.includes('rds') || serviceLower.includes('dynamodb')) {
      costCategory = 'Database'
    } else if (serviceLower.includes('network') || serviceLower.includes('vpc') || serviceLower.includes('cloudfront')) {
      costCategory = 'Network'
    }

    // Build rawRef
    const rawRef: CostEventRawRef = {
      lineItemId,
      billInvoiceId: line['bill/InvoiceId'] || line['InvoiceId'] || undefined,
      timeInterval: line['lineItem/UsageStartDate'] && line['lineItem/UsageEndDate']
        ? `${line['lineItem/UsageStartDate']}/${line['lineItem/UsageEndDate']}`
        : undefined,
      usageAccountId,
      payerAccountId: line['lineItem/PayerAccountId'] || line['PayerAccountId'] || undefined,
      resourceId: resourceId || undefined,
      arn: line['lineItem/UsageAccountId'] && resourceId
        ? `arn:aws:${productCode.toLowerCase()}:${line['lineItem/UsageRegion'] || 'us-east-1'}:${usageAccountId}:${resourceId}`
        : undefined,
    }

    // Generate unique hash
    const uniqueHash = generateUniqueHash(
      orgId,
      lineItemId,
      usageStartDate,
      usageAccountId,
      productCode,
      unblendedCost,
      resourceId
    )

    const costEvent = {
      orgId,
      source: 'AWS',
      occurredAt,
      amountEur,
      amountUsd,
      currency: currencyCode,
      provider: 'aws',
      resourceType: service,
      service,
      usageType: line['lineItem/UsageType'] || line['UsageType'] || undefined,
      quantity: line['lineItem/UsageAmount'] ? parseFloat(line['lineItem/UsageAmount']) : undefined,
      unit: line['pricing/Unit'] || line['Unit'] || undefined,
      costCategory,
      dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined,
      tags: Object.keys(tags).length > 0 ? tags : undefined,
      rawRef,
      uniqueHash,
      ingestionBatchId: batchId,
    }

    return { costEvent, uniqueHash }
  } catch (error) {
    console.error('Error normalizing CUR line:', error)
    return null
  }
}

/**
 * Ingest CUR file from S3
 */
export async function ingestCurFile(
  config: CurIngestionConfig,
  s3Key: string
): Promise<{ rowsParsed: number; eventsUpserted: number; errors: string[] }> {
  const s3Config: S3Config = {
    bucket: config.bucket,
    prefix: config.prefix,
    region: config.region,
    assumeRoleArn: config.assumeRoleArn,
    externalId: config.externalId,
  }

  const s3Client = await createS3Client(s3Config)
  const stream = await downloadS3Object(s3Client, config.bucket, s3Key)

  let headers: string[] = []
  let isFirstLine = true
  let rowsParsed = 0
  let eventsUpserted = 0
  const errors: string[] = []

  // Decompress if .gz
  const inputStream = s3Key.endsWith('.gz')
    ? stream.pipe(createGunzip())
    : stream

  // Parse CSV line by line
  let buffer = ''
  const costEvents: any[] = []
  const batchSize = 100 // Upsert in batches

  return new Promise<{ rowsParsed: number; eventsUpserted: number; errors: string[] }>(
    (resolve, reject) => {
      inputStream.on('data', async (chunk: Buffer) => {
        buffer += chunk.toString('utf-8')
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          try {
            if (isFirstLine) {
              // Parse headers
              headers = line.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
              isFirstLine = false
              continue
            }

            const parsed = parseCurLine(line, headers)
            if (!parsed) {
              continue
            }

            rowsParsed++

            const normalized = normalizeCurLineToCostEvent(config.orgId, parsed, config.batchId)
            if (normalized) {
              costEvents.push(normalized.costEvent)

              // Upsert in batches
              if (costEvents.length >= batchSize) {
                const batch = costEvents.splice(0, batchSize)
                try {
                  const count = await upsertCostEventsBatch(batch)
                  eventsUpserted += count
                } catch (err: any) {
                  errors.push(`Batch upsert error: ${err.message}`)
                }
              }
            }
          } catch (error: any) {
            errors.push(`Line parse error: ${error.message}`)
          }
        }
      })

      inputStream.on('end', async () => {
        // Process remaining buffer
        if (buffer && !isFirstLine) {
          try {
            const parsed = parseCurLine(buffer, headers)
            if (parsed) {
              rowsParsed++
              const normalized = normalizeCurLineToCostEvent(config.orgId, parsed, config.batchId)
              if (normalized) {
                costEvents.push(normalized.costEvent)
              }
            }
          } catch (error: any) {
            errors.push(`Final line parse error: ${error.message}`)
          }
        }

        // Upsert remaining events
        if (costEvents.length > 0) {
          try {
            const count = await upsertCostEventsBatch(costEvents)
            eventsUpserted += count
          } catch (err: any) {
            errors.push(`Final batch upsert error: ${err.message}`)
          }
        }

        resolve({ rowsParsed, eventsUpserted, errors })
      })

      inputStream.on('error', (error: Error) => {
        errors.push(`Stream error: ${error.message}`)
        reject(error)
      })
    }
  )

  return { rowsParsed, eventsUpserted, errors }
}

/**
 * Upsert cost events batch (with deduplication)
 */
async function upsertCostEventsBatch(costEvents: any[]): Promise<number> {
  if (costEvents.length === 0) {
    return 0
  }

  let upserted = 0

  // Use createMany with skipDuplicates for better performance
  // But Prisma doesn't support skipDuplicates with unique constraints on JSON fields
  // So we'll use individual upserts
  for (const event of costEvents) {
    try {
      await prisma.costEvent.upsert({
        where: {
          orgId_uniqueHash: {
            orgId: event.orgId,
            uniqueHash: event.uniqueHash,
          },
        },
        update: {
          amountEur: event.amountEur,
          amountUsd: event.amountUsd,
          updatedAt: new Date(),
        },
        create: event,
      })
      upserted++
    } catch (error: any) {
      // Ignore duplicate errors (already exists)
      if (!error.message?.includes('Unique constraint')) {
        throw error
      }
    }
  }

  return upserted
}

/**
 * Sync CUR for an organization
 */
export async function syncCurForOrg(orgId: string): Promise<CurIngestionResult> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      awsCurEnabled: true,
      awsCurBucket: true,
      awsCurPrefix: true,
      awsCurRegion: true,
      awsPayerAccountId: true,
      awsAssumeRoleArn: true,
      cloudAccounts: {
        where: {
          provider: 'AWS',
          connectionType: 'CUR',
          status: 'active',
        },
        select: {
          id: true,
          curBucket: true,
          curPrefix: true,
          curRegion: true,
        },
        take: 1,
      },
    },
  })

  if (!org || !org.awsCurEnabled) {
    throw new Error(`Organization ${orgId} does not have CUR enabled`)
  }

  // Use cloud account override if available, otherwise org-level config
  const bucket = org.cloudAccounts[0]?.curBucket || org.awsCurBucket
  const prefix = org.cloudAccounts[0]?.curPrefix || org.awsCurPrefix || ''
  const region = org.cloudAccounts[0]?.curRegion || org.awsCurRegion || 'us-east-1'

  if (!bucket) {
    throw new Error(`No CUR bucket configured for organization ${orgId}`)
  }

  // Create batch
  const batchId = `cur-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(2, 9)}`
  const batch = await prisma.ingestionBatch.create({
    data: {
      orgId,
      batchId,
      source: 'AWS_CUR',
      status: 'running',
      startedAt: new Date(),
    },
  })

  try {
    const s3Config: S3Config = {
      bucket,
      prefix,
      region,
      assumeRoleArn: org.awsAssumeRoleArn || undefined,
    }

    const s3Client = await createS3Client(s3Config)
    const files = await listCurFiles(s3Client, bucket, prefix, 100)

    if (files.length === 0) {
      await prisma.ingestionBatch.update({
        where: { id: batch.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          objectsProcessed: 0,
        },
      })

      return {
        batchId,
        objectsProcessed: 0,
        rowsParsed: 0,
        eventsUpserted: 0,
        errorsCount: 0,
        sampleError: null,
      }
    }

    // Process files (start with most recent)
    let totalRowsParsed = 0
    let totalEventsUpserted = 0
    const allErrors: string[] = []

    for (const file of files.slice(-10)) {
      // Process last 10 files (most recent)
      try {
        const result = await ingestCurFile(
          {
            orgId,
            bucket,
            prefix,
            region,
            assumeRoleArn: org.awsAssumeRoleArn || undefined,
            batchId,
          },
          file
        )

        totalRowsParsed += result.rowsParsed
        totalEventsUpserted += result.eventsUpserted
        allErrors.push(...result.errors)
      } catch (error: any) {
        allErrors.push(`File ${file}: ${error.message}`)
      }
    }

    // Update batch
    await prisma.ingestionBatch.update({
      where: { id: batch.id },
      data: {
        status: allErrors.length > 0 && totalEventsUpserted === 0 ? 'failed' : 'completed',
        finishedAt: new Date(),
        objectsProcessed: files.length,
        rowsParsed: totalRowsParsed,
        eventsUpserted: totalEventsUpserted,
        errorsCount: allErrors.length,
        sampleError: allErrors[0]?.substring(0, 500) || null,
      },
    })

    // Update org/cloud account last sync
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        // Note: We don't have lastCurSyncAt on Organization, only on CloudAccount
      },
    })

    if (org.cloudAccounts[0]) {
      await prisma.cloudAccount.update({
        where: { id: org.cloudAccounts[0].id },
        data: {
          lastCurSyncAt: new Date(),
          lastCurSyncError: allErrors.length > 0 ? allErrors[0] : null,
        },
      })
    }

    return {
      batchId,
      objectsProcessed: files.length,
      rowsParsed: totalRowsParsed,
      eventsUpserted: totalEventsUpserted,
      errorsCount: allErrors.length,
      sampleError: allErrors[0] || null,
    }
  } catch (error: any) {
    await prisma.ingestionBatch.update({
      where: { id: batch.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorsCount: 1,
        sampleError: error.message?.substring(0, 500) || 'Unknown error',
      },
    })

    throw error
  }
}

