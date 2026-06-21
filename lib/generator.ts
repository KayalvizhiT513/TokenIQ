export interface UsageEntry {
  provider: 'openai' | 'anthropic' | 'github'
  model: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet' | 'claude-3-opus' | 'copilot-gpt-4'
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
}

interface PRMetadata {
  linesAdded: number
  linesDeleted: number
}

const MODEL_THRESHOLD_LINES = 300

// OpenAI pricing as of June 2026 (per 1k tokens)
const PRICING = {
  'gpt-4o': {
    input: 0.0025,
    output: 0.01,
    cached: 0.00125,
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
    cached: 0.000075,
  },
}

export function deriveUsage(pr: PRMetadata): UsageEntry {
  const linesChanged = pr.linesAdded + pr.linesDeleted
  const model = linesChanged > MODEL_THRESHOLD_LINES ? 'gpt-4o' : 'gpt-4o-mini'

  // Estimate tokens based on lines changed
  // ~8 tokens per line of context
  const inputTokens = Math.round(linesChanged * 8)
  // AI response is roughly 40% of input size
  const outputTokens = Math.round(inputTokens * 0.4)
  // 30% cache hit rate
  const cachedInputTokens = Math.round(inputTokens * 0.3)

  const pricing = PRICING[model]
  const costUsd =
    (inputTokens / 1000) * pricing.input +
    (outputTokens / 1000) * pricing.output +
    (cachedInputTokens / 1000) * pricing.cached

  return {
    provider: 'openai',
    model,
    inputTokens,
    outputTokens,
    cachedInputTokens,
    costUsd: Math.round(costUsd * 10000) / 10000, // round to 4 decimals
  }
}
