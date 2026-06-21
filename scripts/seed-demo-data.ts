import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Pricing for different models (per 1k tokens)
const MODEL_PRICING = {
  'gpt-4o': { provider: 'openai', input: 0.0025, output: 0.01, cached: 0.00125 },
  'gpt-4o-mini': { provider: 'openai', input: 0.00015, output: 0.0006, cached: 0.000075 },
  'claude-3-5-sonnet': { provider: 'anthropic', input: 0.003, output: 0.015, cached: 0.0015 },
  'claude-3-opus': { provider: 'anthropic', input: 0.015, output: 0.075, cached: 0.0075 },
  'copilot-gpt-4': { provider: 'github', input: 0.002, output: 0.006, cached: 0.001 },
}

type ModelKey = keyof typeof MODEL_PRICING

async function seedDemoActualCosts() {
  try {
    // Get all usage records without provider/actual costs
    const records = await prisma.usageRecord.findMany({
      include: { pullRequest: true },
    })

    if (records.length === 0) {
      console.log('No records to update')
      return { updated: 0 }
    }

    const models = Object.keys(MODEL_PRICING) as ModelKey[]
    let updated = 0

    for (const record of records) {
      // Assign different models across records
      const modelIndex = updated % models.length
      const selectedModel = models[modelIndex]
      const pricing = MODEL_PRICING[selectedModel]

      // Create realistic variance (±15%)
      const tokenVariance = 0.85 + Math.random() * 0.3
      const actualInputTokens = Math.round(record.inputTokens * tokenVariance)
      const actualOutputTokens = Math.round(record.outputTokens * tokenVariance)

      // Calculate actual cost
      const actualCost =
        (actualInputTokens / 1000) * pricing.input +
        (actualOutputTokens / 1000) * pricing.output

      // Generate insights based on PR size
      const prSize = record.pullRequest.linesAdded + record.pullRequest.linesDeleted
      const insights = generateInsights(selectedModel, prSize, actualCost, record.costUsd)

      await prisma.usageRecord.update({
        where: { id: record.id },
        data: {
          provider: pricing.provider,
          model: selectedModel,
          actualCostUsd: Math.round(actualCost * 10000) / 10000,
          actualInputTokens,
          actualOutputTokens,
          insights,
        },
      })
      updated++
    }

    console.log(`✓ Seeded actual costs and insights for ${updated} records`)
    return { updated, records: records.length }
  } catch (error) {
    console.error('Failed to seed demo data:', error)
    throw error
  }
}

function generateInsights(model: string, lines: number, actual: number, estimated: number): string {
  const variance = Math.round(((actual - estimated) / estimated) * 100)
  const efficiency = variance < 0 ? 'more efficient' : 'less efficient'
  const diffStr = variance < 0 ? `${Math.abs(variance)}% cheaper` : `${variance}% costlier`

  if (lines < 50) {
    return `${model} was ${efficiency} than expected (${diffStr}) for small, focused changes.`
  } else if (lines < 200) {
    return `${model} handled medium-sized PR well, ${efficiency} than baseline (${diffStr}).`
  } else {
    return `${model} processed large refactor ${efficiency} (${diffStr}). Good for complex changes.`
  }
}

seedDemoActualCosts()
  .then(result => {
    console.log(`Done! Updated ${result.updated} records`)
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
