import { prisma } from '@/lib/db'
import { usageRecordVisibilityFilter } from '@/lib/demo-data'

export async function GET() {
  try {
    const usageRecords = await prisma.usageRecord.findMany({
      where: usageRecordVisibilityFilter,
      include: {
        pullRequest: true,
      },
      orderBy: { generatedAt: 'desc' },
    })

    const withActualCosts = usageRecords.filter(r => r.actualCostUsd !== null)

    const stats = {
      totalRecords: usageRecords.length,
      recordsWithActualCosts: withActualCosts.length,
      estimatedTotal: usageRecords.reduce((sum, r) => sum + r.costUsd, 0),
      actualTotal: withActualCosts.reduce((sum, r) => sum + (r.actualCostUsd || 0), 0),
      variance: 0,
      accuracyPercentage: 0,
    }

    if (stats.estimatedTotal > 0 && stats.actualTotal > 0) {
      stats.variance = stats.actualTotal - stats.estimatedTotal
      stats.accuracyPercentage = Math.round(
        ((Math.abs(stats.variance) / stats.estimatedTotal) * 100 * -1 + 100)
      )
    }

    const comparisonData = withActualCosts
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        prNumber: r.pullRequest.number,
        prTitle: r.pullRequest.title,
        estimatedCost: r.costUsd,
        actualCost: r.actualCostUsd || 0,
        variance: (r.actualCostUsd || 0) - r.costUsd,
        variancePercent: r.costUsd > 0 ? Math.round((((r.actualCostUsd || 0) - r.costUsd) / r.costUsd) * 100) : 0,
        estimatedTokens: r.inputTokens + r.outputTokens,
        actualTokens: r.actualInputTokens && r.actualOutputTokens ? r.actualInputTokens + r.actualOutputTokens : null,
        provider: (r as any).provider || 'openai',
        model: r.model,
        insights: (r as any).insights,
      }))

    return Response.json({
      stats,
      comparisonData,
    })
  } catch (error) {
    console.error('Cost comparison API error:', error)
    return Response.json({ error: 'Failed to load cost comparison data' }, { status: 500 })
  }
}
