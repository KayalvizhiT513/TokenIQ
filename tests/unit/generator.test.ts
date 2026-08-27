import { describe, it, expect } from 'vitest'
import { deriveUsage } from '@/lib/generator'
import { PullRequest } from '@prisma/client'

describe('deriveUsage', () => {
  const modelConfig = { provider: 'openai', model: 'gpt-4o', inputCostPerMillion: 2.5, outputCostPerMillion: 10, cachedCostPerMillion: 1.25 }
  const createMockPR = (linesAdded: number, linesDeleted: number): PullRequest => ({
    id: 'test-1',
    repositoryId: 'repo-1',
    number: 1,
    title: 'Test PR',
    author: 'test-user',
    filesChanged: 5,
    linesAdded,
    linesDeleted,
    mergedAt: new Date(),
    openedAt: new Date(),
    minutesToMerge: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  it('uses the selected model for PRs of any size', () => {
    const pr = createMockPR(200, 150)
    const usage = deriveUsage(pr, modelConfig)
    expect(usage.model).toBe('gpt-4o')
  })

  it('keeps the selected model for small PRs', () => {
    const pr = createMockPR(100, 50)
    const usage = deriveUsage(pr, modelConfig)
    expect(usage.model).toBe('gpt-4o')
  })

  it('should calculate tokens proportional to lines changed', () => {
    const pr = createMockPR(100, 50)
    const usage = deriveUsage(pr, modelConfig)
    // 150 lines * 8 tokens/line = 1200 tokens
    expect(usage.inputTokens).toBe(1200)
  })

  it('should estimate output tokens as 40% of input', () => {
    const pr = createMockPR(100, 50)
    const usage = deriveUsage(pr, modelConfig)
    // 1200 * 0.4 = 480
    expect(usage.outputTokens).toBe(480)
  })

  it('should estimate cached tokens as 30% of input', () => {
    const pr = createMockPR(100, 50)
    const usage = deriveUsage(pr, modelConfig)
    // 1200 * 0.3 = 360
    expect(usage.cachedInputTokens).toBe(360)
  })

  it('should calculate cost correctly for gpt-4o', () => {
    const pr = createMockPR(400, 100)
    const usage = deriveUsage(pr, modelConfig)

    // Input: 500 * 8 = 4000 tokens, cost = 4000/1000 * 0.0025 = 0.01
    // Output: 4000 * 0.4 = 1600 tokens, cost = 1600/1000 * 0.01 = 0.016
    // Cached: 4000 * 0.3 = 1200 tokens, cost = 1200/1000 * 0.00125 = 0.0015
    // Total = 0.0275
    expect(usage.costUsd).toBeCloseTo(0.0275, 4)
  })

  it('uses whichever pricing configuration is supplied', () => {
    const pr = createMockPR(100, 50)
    const usage = deriveUsage(pr, { provider: 'openai', model: 'gpt-4o-mini', inputCostPerMillion: 0.15, outputCostPerMillion: 0.6, cachedCostPerMillion: 0.075 })

    // Input: 150 * 8 = 1200 tokens, cost = 1200/1000 * 0.00015 = 0.00018
    // Output: 1200 * 0.4 = 480 tokens, cost = 480/1000 * 0.0006 = 0.000288
    // Cached: 1200 * 0.3 = 360 tokens, cost = 360/1000 * 0.000075 = 0.000027
    // Total = 0.000495, rounded to 4 decimals = 0.0005
    expect(usage.costUsd).toBeCloseTo(0.0005, 4)
  })
})
