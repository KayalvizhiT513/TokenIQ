import { prisma } from '@/lib/db'

export type PRCategory = 'small' | 'medium' | 'large' | 'refactor'

interface PRAnalysis {
  category: PRCategory
  complexity: 'simple' | 'moderate' | 'complex'
  type: string // 'feature' | 'bugfix' | 'refactor' | 'docs'
  description: string
}

export async function analyzeAllPRs() {
  try {
    const records = await prisma.usageRecord.findMany({
      include: { pullRequest: true },
    })

    console.log(`Analyzing ${records.length} records for model performance...`)

    const analyses: Record<string, PRAnalysis[]> = {
      small: [],
      medium: [],
      large: [],
      refactor: [],
    }

    // Group records by PR category
    for (const record of records) {
      const pr = record.pullRequest
      const lines = pr.linesAdded + pr.linesDeleted
      const filesChanged = pr.filesChanged
      const isRefactor = pr.title?.toLowerCase().includes('refactor')

      let category: PRCategory = 'small'
      if (isRefactor) {
        category = 'refactor'
      } else if (lines > 300) {
        category = 'large'
      } else if (lines > 100) {
        category = 'medium'
      }

      const complexity = calculateComplexity(lines, filesChanged, pr.title || '')
      const type = inferPRType(pr.title || '')

      analyses[category].push({
        category,
        complexity,
        type,
        description: `${type}: ${pr.title}`,
      })
    }

    // Generate insights for each category
    const modelPerformance = groupByModel(records)
    const insights = generateCategoryInsights(analyses, modelPerformance, records)

    console.log('Generated insights:')
    Object.entries(insights).forEach(([category, msg]) => {
      console.log(`  ${category}: ${msg}`)
    })

    return insights
  } catch (error) {
    console.error('Error analyzing PRs:', error)
    throw error
  }
}

function calculateComplexity(
  lines: number,
  files: number,
  title: string
): 'simple' | 'moderate' | 'complex' {
  const complexity = lines + files * 10
  const hasComplexKeywords = /refactor|migration|optimize|rewrite/i.test(title)

  if (complexity > 500 || hasComplexKeywords) return 'complex'
  if (complexity > 200) return 'moderate'
  return 'simple'
}

function inferPRType(title: string): string {
  if (/feat|feature/i.test(title)) return 'feature'
  if (/fix|bug/i.test(title)) return 'bugfix'
  if (/refactor|optimize/i.test(title)) return 'refactor'
  if (/doc|readme|comment/i.test(title)) return 'docs'
  return 'other'
}

interface ModelMetrics {
  [model: string]: {
    count: number
    avgCost: number
    avgTokens: number
    variance: number[]
  }
}

function groupByModel(records: any[]): ModelMetrics {
  const metrics: ModelMetrics = {}

  for (const record of records) {
    const model = record.model
    if (!metrics[model]) {
      metrics[model] = {
        count: 0,
        avgCost: 0,
        avgTokens: 0,
        variance: [],
      }
    }

    metrics[model].count += 1
    metrics[model].avgCost += record.costUsd
    metrics[model].avgTokens += record.inputTokens + record.outputTokens

    if (record.actualCostUsd) {
      const v = Math.round(((record.actualCostUsd - record.costUsd) / record.costUsd) * 100)
      metrics[model].variance.push(v)
    }
  }

  // Calculate averages
  for (const model in metrics) {
    metrics[model].avgCost = Math.round((metrics[model].avgCost / metrics[model].count) * 10000) / 10000
    metrics[model].avgTokens = Math.round(metrics[model].avgTokens / metrics[model].count)
  }

  return metrics
}

interface CategoryInsights {
  [category: string]: string
}

function generateCategoryInsights(
  analyses: Record<string, PRAnalysis[]>,
  performance: ModelMetrics,
  records: any[]
): CategoryInsights {
  const insights: CategoryInsights = {}

  // Find best performing models
  const modelsByEfficiency = Object.entries(performance)
    .sort(([, a], [, b]) => {
      const aVariance = a.variance.length ? Math.abs(a.variance.reduce((a, b) => a + b) / a.variance.length) : 0
      const bVariance = b.variance.length ? Math.abs(b.variance.reduce((a, b) => a + b) / b.variance.length) : 0
      return aVariance - bVariance
    })
    .map(([model]) => model)

  const bestModel = modelsByEfficiency[0] || 'gpt-4o'
  const mostCostly = Object.entries(performance).sort(([, a], [, b]) => b.avgCost - a.avgCost)[0]?.[0]

  insights['overall'] =
    `${bestModel} is the most cost-efficient model. ` +
    (mostCostly ? `${mostCostly} is the priciest per PR on average.` : '')

  // Small PRs insight
  if (analyses.small.length > 0) {
    const smallPRModels = getModelsForCategory(records, 'small')
    const cheapest = smallPRModels ? Object.entries(smallPRModels).sort(([, a], [, b]) => a.avgCost - b.avgCost)[0]?.[0] : 'gpt-4o-mini'
    insights['small'] = `Small PRs (< 100 lines): ${cheapest || 'gpt-4o-mini'} is most economical (${analyses.small.length} PRs analyzed).`
  }

  // Medium PRs insight
  if (analyses.medium.length > 0) {
    insights['medium'] = `Medium PRs (100-300 lines): Balanced cost-quality tradeoff recommended (${analyses.medium.length} PRs analyzed).`
  }

  // Large PRs insight
  if (analyses.large.length > 0) {
    insights['large'] = `Large PRs (> 300 lines): More complex analysis needed; consider premium models for quality (${analyses.large.length} PRs analyzed).`
  }

  // Refactor insight
  if (analyses.refactor.length > 0) {
    const refactorModels = getModelsForCategory(records, 'refactor')
    insights['refactor'] = `Refactors: Specialized handling recommended (${analyses.refactor.length} refactors tracked).`
  }

  return insights
}

function getModelsForCategory(records: any[], keyword: string): ModelMetrics | null {
  const filtered = records.filter(r => {
    const lines = r.pullRequest.linesAdded + r.pullRequest.linesDeleted
    const isRefactor = r.pullRequest.title?.toLowerCase().includes('refactor')

    if (keyword === 'small') return lines < 100
    if (keyword === 'medium') return lines >= 100 && lines <= 300
    if (keyword === 'large') return lines > 300
    if (keyword === 'refactor') return isRefactor
    return false
  })

  if (filtered.length === 0) return null
  return groupByModel(filtered)
}

export async function updatePRInsights() {
  try {
    const categoryInsights = await analyzeAllPRs()
    const records = await prisma.usageRecord.findMany({
      include: { pullRequest: true },
    })

    console.log(`Updating insights for ${records.length} records...`)

    let updated = 0
    for (const record of records) {
      const pr = record.pullRequest
      const lines = pr.linesAdded + pr.linesDeleted
      const model = record.model || 'unknown'

      // Generate PR-specific insight
      let insight = `Used ${model}.`

      if (lines < 50) {
        insight += ` ${categoryInsights['small'] || 'Good for small focused changes.'}`
      } else if (lines < 300) {
        insight += ` ${categoryInsights['medium'] || 'Suitable for medium-complexity PRs.'}`
      } else {
        insight += ` ${categoryInsights['large'] || 'Handled large PR effectively.'}`
      }

      if (record.actualCostUsd) {
        const variance = Math.round(((record.actualCostUsd - record.costUsd) / record.costUsd) * 100)
        insight += ` ${variance < 0 ? `Cost ${Math.abs(variance)}% less than estimated.` : `Cost ${variance}% more than estimated.`}`
      }

      await prisma.usageRecord.update({
        where: { id: record.id },
        data: { insights: insight },
      })
      updated++
    }

    console.log(`✓ Updated insights for ${updated} records`)
    return { updated, categoryInsights }
  } catch (error) {
    console.error('Error updating PR insights:', error)
    throw error
  }
}
