import { prisma } from '@/lib/db'
import { usageRecordVisibilityFilter } from '@/lib/demo-data'

export async function GET() {
  try {
    const usageEvents = await prisma.usageEvent.findMany({ orderBy: { startedAt: 'desc' } })
    const usageRecords = await prisma.usageRecord.findMany({
      where: usageRecordVisibilityFilter,
      include: {
        pullRequest: {
          include: {
            repository: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    })

    const totalCost = usageRecords.reduce((sum, r) => sum + r.costUsd, 0)
    const prCount = usageRecords.length
    const avgCostPerPr = prCount > 0 ? totalCost / prCount : 0
    const modelCounts = usageRecords.reduce(
      (acc, r) => {
        acc[r.model] = (acc[r.model] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const modelCosts = usageRecords.reduce(
      (acc, r) => {
        acc[r.model] = (acc[r.model] || 0) + r.costUsd
        return acc
      },
      {} as Record<string, number>,
    )

    const topExpensivePrs = usageRecords
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 5)

    const modelChartData = Object.entries(modelCosts).map(([model, cost]) => ({
      name: model,
      value: Math.round(cost * 100) / 100,
    }))

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const costByDay: Record<string, Record<string, number>> = {}
    usageRecords.forEach((r) => {
      if (r.generatedAt >= thirtyDaysAgo) {
        const date = r.generatedAt.toISOString().split('T')[0]
        if (!costByDay[date]) costByDay[date] = {}
        costByDay[date][r.model] = (costByDay[date][r.model] || 0) + r.costUsd
      }
    })

    const costTrendData = Object.entries(costByDay)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, models]) => ({
        date: new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        'gpt-4o': Math.round((models['gpt-4o'] || 0) * 100) / 100,
        'gpt-4o-mini': Math.round((models['gpt-4o-mini'] || 0) * 100) / 100,
      }))

    const telemetry = usageEvents.reduce((acc, event) => ({
      requests: acc.requests + 1,
      tokens: acc.tokens + event.totalTokens,
      latencyTotal: acc.latencyTotal + (event.latencyMs ?? 0),
      latencyCount: acc.latencyCount + (event.latencyMs === null ? 0 : 1),
      costUsd: acc.costUsd + (event.costUsd ?? 0),
    }), { requests: 0, tokens: 0, latencyTotal: 0, latencyCount: 0, costUsd: 0 })

    return Response.json({
      totalCost,
      prCount,
      avgCostPerPr,
      modelCounts,
      modelCosts,
      topExpensivePrs: topExpensivePrs.map(r => ({
        id: r.id,
        costUsd: r.costUsd,
        pullRequest: r.pullRequest,
        model: r.model,
      })),
      costTrendData,
      modelChartData,
      telemetry: {
        ...telemetry,
        avgLatencyMs: telemetry.latencyCount ? Math.round(telemetry.latencyTotal / telemetry.latencyCount) : null,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return Response.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
