/**
 * Internal AI SDK for server-side use
 */

import { processAiRequest, type AiRequestInput, type AiRequestResponse } from './gateway'

export interface AiSDKRequest {
  orgId: string
  actorUserId: string
  model: string
  input: string | Array<{ role: string; content: string }>
  metadata?: {
    teamId?: string
    projectId?: string
    appId?: string
    clientId?: string
    taskType?: string
    [key: string]: any
  }
  scope?: {
    teamId?: string
    projectId?: string
    appId?: string
    clientId?: string
  }
  maxTokens?: number
  temperature?: number
}

/**
 * Make AI request via gateway
 */
export async function aiRequest(request: AiSDKRequest): Promise<AiRequestResponse> {
  const input: AiRequestInput = {
    orgId: request.orgId,
    userId: request.actorUserId,
    teamId: request.metadata?.teamId || request.scope?.teamId,
    projectId: request.metadata?.projectId || request.scope?.projectId,
    appId: request.metadata?.appId || request.scope?.appId,
    clientId: request.metadata?.clientId || request.scope?.clientId,
    model: request.model,
    maxTokens: request.maxTokens,
    temperature: request.temperature,
    metadata: request.metadata,
  }

  if (typeof request.input === 'string') {
    input.prompt = request.input
  } else {
    input.messages = request.input
  }

  return await processAiRequest(input)
}

