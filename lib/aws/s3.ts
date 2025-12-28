/**
 * AWS S3 utilities for CUR file access
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

export interface S3Config {
  bucket: string
  prefix?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  assumeRoleArn?: string
  externalId?: string
}

/**
 * Create S3 client with optional assume role
 */
export async function createS3Client(config: S3Config): Promise<S3Client> {
  const clientConfig: any = {
    region: config.region || 'us-east-1',
  }

  // If credentials provided, use them
  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }
  }

  // If assume role provided, we'd need STS AssumeRole
  // For MVP, we'll use direct credentials or IAM role from environment
  // TODO: Implement STS AssumeRole if assumeRoleArn is provided

  return new S3Client(clientConfig)
}

/**
 * List CUR files in S3 bucket/prefix
 */
export async function listCurFiles(
  client: S3Client,
  bucket: string,
  prefix: string,
  maxKeys: number = 1000
): Promise<string[]> {
  const files: string[] = []
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    })

    const response = await client.send(command)

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && (obj.Key.endsWith('.csv.gz') || obj.Key.endsWith('.csv'))) {
          files.push(obj.Key)
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return files.sort() // Sort to process oldest first
}

/**
 * Download and stream S3 object
 */
export async function downloadS3Object(
  client: S3Client,
  bucket: string,
  key: string
): Promise<NodeJS.ReadableStream> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new Error(`Empty response body for s3://${bucket}/${key}`)
  }

  // Convert to Node.js stream
  return response.Body as NodeJS.ReadableStream
}

/**
 * Get latest CUR partition (by date)
 */
export async function getLatestCurPartition(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<string | null> {
  const files = await listCurFiles(client, bucket, prefix, 100)

  if (files.length === 0) {
    return null
  }

  // CUR files typically have date in path: prefix/YYYY/MM/DD/filename.csv.gz
  // Sort by key (lexicographic) and take the last one
  return files[files.length - 1]
}

