export interface UsageEntry {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
}

interface PRMetadata {
  linesAdded: number
  linesDeleted: number
}

export interface ModelPricing {
  provider: string
  model: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  cachedCostPerMillion: number
}

export function deriveUsage(pr: PRMetadata, modelConfig: ModelPricing): UsageEntry {
  const linesChanged = pr.linesAdded + pr.linesDeleted

  // Estimate tokens based on lines changed
  // ~8 tokens per line of context
  const inputTokens = Math.round(linesChanged * 8)
  // AI response is roughly 40% of input size
  const outputTokens = Math.round(inputTokens * 0.4)
  // 30% cache hit rate
  const cachedInputTokens = Math.round(inputTokens * 0.3)

  const costUsd =
    (inputTokens / 1_000_000) * modelConfig.inputCostPerMillion +
    (outputTokens / 1_000_000) * modelConfig.outputCostPerMillion +
    (cachedInputTokens / 1_000_000) * modelConfig.cachedCostPerMillion

  return {
    provider: modelConfig.provider,
    model: modelConfig.model,
    inputTokens,
    outputTokens,
    cachedInputTokens,
    costUsd: Math.round(costUsd * 10000) / 10000, // round to 4 decimals
  }
}
