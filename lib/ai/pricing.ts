/**
 * AI Model Pricing Table (EUR per 1M tokens)
 * Updated as of 2025-01
 */

export interface ModelPricing {
  inputPricePer1M: number // EUR per 1M input tokens
  outputPricePer1M: number // EUR per 1M output tokens
  provider: string
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': {
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
    provider: 'openai',
  },
  'gpt-4o-mini': {
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
    provider: 'openai',
  },
  'gpt-4-turbo': {
    inputPricePer1M: 8.0,
    outputPricePer1M: 24.0,
    provider: 'openai',
  },
  'gpt-4': {
    inputPricePer1M: 24.0,
    outputPricePer1M: 48.0,
    provider: 'openai',
  },
  'gpt-3.5-turbo': {
    inputPricePer1M: 0.5,
    outputPricePer1M: 1.5,
    provider: 'openai',
  },
  'o1-preview': {
    inputPricePer1M: 12.0,
    outputPricePer1M: 60.0,
    provider: 'openai',
  },
  'o1-mini': {
    inputPricePer1M: 3.0,
    outputPricePer1M: 12.0,
    provider: 'openai',
  },

  // Anthropic
  'claude-3-5-sonnet-20241022': {
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
    provider: 'anthropic',
  },
  'claude-3-5-sonnet-20240620': {
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
    provider: 'anthropic',
  },
  'claude-3-opus-20240229': {
    inputPricePer1M: 12.0,
    outputPricePer1M: 60.0,
    provider: 'anthropic',
  },
  'claude-3-sonnet-20240229': {
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
    provider: 'anthropic',
  },
  'claude-3-haiku-20240307': {
    inputPricePer1M: 0.25,
    outputPricePer1M: 1.25,
    provider: 'anthropic',
  },

  // Google
  'gemini-pro': {
    inputPricePer1M: 0.5,
    outputPricePer1M: 1.5,
    provider: 'google',
  },
  'gemini-pro-vision': {
    inputPricePer1M: 0.5,
    outputPricePer1M: 1.5,
    provider: 'google',
  },

  // Mistral
  'mistral-large': {
    inputPricePer1M: 2.0,
    outputPricePer1M: 6.0,
    provider: 'mistral',
  },
  'mistral-medium': {
    inputPricePer1M: 1.0,
    outputPricePer1M: 3.0,
    provider: 'mistral',
  },
  'mistral-small': {
    inputPricePer1M: 0.2,
    outputPricePer1M: 0.6,
    provider: 'mistral',
  },
}

/**
 * Estimate cost for AI request
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]

  if (!pricing) {
    // Default fallback pricing (conservative estimate)
    return ((inputTokens + outputTokens) / 1_000_000) * 2.0 // 2 EUR per 1M tokens
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1M
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M

  return inputCost + outputCost
}

/**
 * Get provider from model name
 */
export function getProviderFromModel(model: string): string {
  const pricing = MODEL_PRICING[model]
  if (pricing) {
    return pricing.provider
  }

  // Heuristic fallback
  if (model.startsWith('gpt-') || model.startsWith('o1-')) {
    return 'openai'
  }
  if (model.startsWith('claude-')) {
    return 'anthropic'
  }
  if (model.startsWith('gemini-')) {
    return 'google'
  }
  if (model.startsWith('mistral-')) {
    return 'mistral'
  }

  return 'unknown'
}

