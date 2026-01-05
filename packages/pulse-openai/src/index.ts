/**
 * Pulse OpenAI Client
 * 
 * A wrapper around OpenAI SDK that works with Pulse AI Gateway
 * as an OpenAI-compatible baseURL.
 */

import OpenAI from 'openai'

export interface PulseClientConfig {
  baseURL: string // e.g., "https://your-pulse-instance.com/api/v1"
  apiKey: string // Your Pulse AI Gateway Key
  organization?: string
}

export interface AttributionOptions {
  appId?: string
  projectId?: string
  clientId?: string
  teamId?: string
}

/**
 * Pulse OpenAI Client
 * 
 * Example usage:
 * ```typescript
 * import { PulseOpenAI } from '@pulse/openai'
 * 
 * const client = new PulseOpenAI({
 *   baseURL: 'https://pulse.example.com/api/v1',
 *   apiKey: 'pulse_key_...',
 * })
 * 
 * const completion = await client.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * })
 * ```
 */
export class PulseOpenAI {
  private client: OpenAI
  private defaultAttribution: AttributionOptions = {}

  constructor(config: PulseClientConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      organization: config.organization,
    })
  }

  /**
   * Create a new client with attribution headers set
   * 
   * Example:
   * ```typescript
   * const clientWithAttribution = client.withAttribution({
   *   appId: 'app_123',
   *   projectId: 'proj_456',
   * })
   * 
   * const completion = await clientWithAttribution.chat.completions.create({
   *   model: 'gpt-4',
   *   messages: [{ role: 'user', content: 'Hello!' }],
   * })
   * ```
   */
  withAttribution(attribution: AttributionOptions): PulseOpenAIWithAttribution {
    return new PulseOpenAIWithAttribution(this.client, attribution)
  }

  /**
   * Access OpenAI client directly
   */
  get openai(): OpenAI {
    return this.client
  }
}

/**
 * Pulse OpenAI Client with attribution headers
 */
class PulseOpenAIWithAttribution {
  private client: OpenAI
  private attribution: AttributionOptions

  constructor(client: OpenAI, attribution: AttributionOptions) {
    this.client = client
    this.attribution = attribution
  }

  /**
   * Chat completions with attribution headers
   */
  chat = {
    completions: {
      create: async (params: Parameters<OpenAI['chat']['completions']['create']>[0], options?: any) => {
        const headers: Record<string, string> = {}
        
        if (this.attribution.appId) {
          headers['x-pulse-app'] = this.attribution.appId
        }
        if (this.attribution.projectId) {
          headers['x-pulse-project'] = this.attribution.projectId
        }
        if (this.attribution.clientId) {
          headers['x-pulse-client'] = this.attribution.clientId
        }
        if (this.attribution.teamId) {
          headers['x-pulse-team'] = this.attribution.teamId
        }

        return this.client.chat.completions.create(params, {
          ...options,
          headers: {
            ...options?.headers,
            ...headers,
          },
        })
      },
    },
  }

  /**
   * Embeddings with attribution headers
   */
  embeddings = {
    create: async (params: Parameters<OpenAI['embeddings']['create']>[0], options?: any) => {
      const headers: Record<string, string> = {}
      
      if (this.attribution.appId) {
        headers['x-pulse-app'] = this.attribution.appId
      }
      if (this.attribution.projectId) {
        headers['x-pulse-project'] = this.attribution.projectId
      }
      if (this.attribution.clientId) {
        headers['x-pulse-client'] = this.attribution.clientId
      }
      if (this.attribution.teamId) {
        headers['x-pulse-team'] = this.attribution.teamId
      }

      return this.client.embeddings.create(params, {
        ...options,
        headers: {
          ...options?.headers,
          ...headers,
        },
      })
    },
  }

  /**
   * Access OpenAI client directly
   */
  get openai(): OpenAI {
    return this.client
  }
}

// Export default
export default PulseOpenAI

