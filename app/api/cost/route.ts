import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const usageRecords = await prisma.usageRecord.findMany({
      include: { pullRequest: true },
      orderBy: { generatedAt: 'desc' },
    })

    const totalCost = usageRecords.reduce((sum, r) => sum + r.costUsd, 0)

    const costBuckets: Record<string, { cost: number; count: number }> = {
      '0-50': { cost: 0, count: 0 },
      '50-100': { cost: 0, count: 0 },
      '100-200': { cost: 0, count: 0 },
      '200-300': { cost: 0, count: 0 },
      '300-500': { cost: 0, count: 0 },
      '500-1000': { cost: 0, count: 0 },
      '1000+': { cost: 0, count: 0 },
    }

    usageRecords.forEach((r) => {
      const lines = r.pullRequest.linesAdded + r.pullRequest.linesDeleted
      let bucket: string
      if (lines <= 50) bucket = '0-50'
      else if (lines <= 100) bucket = '50-100'
      else if (lines <= 200) bucket = '100-200'
      else if (lines <= 300) bucket = '200-300'
      else if (lines <= 500) bucket = '300-500'
      else if (lines <= 1000) bucket = '500-1000'
      else bucket = '1000+'

      costBuckets[bucket].cost += r.costUsd
      costBuckets[bucket].count += 1
    })

    const bucketChartData = Object.entries(costBuckets).map(([bucket, data]) => ({
      bucket,
      cost: Math.round(data.cost * 100) / 100,
      count: data.count,
    }))

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const costByDate: Record<string, number> = {}
    let cumulativeCost = 0

    usageRecords.forEach((r) => {
      if (r.generatedAt >= thirtyDaysAgo) {
        const date = r.generatedAt.toISOString().split('T')[0]
        if (!costByDate[date]) costByDate[date] = 0
        costByDate[date] += r.costUsd
      }
    })

    const trendData = Object.entries(costByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, cost]) => {
        cumulativeCost += cost
        return {
          date: new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          daily: Math.round(cost * 100) / 100,
          cumulative: Math.round(cumulativeCost * 100) / 100,
        }
      })

    const topPrs = usageRecords
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        number: r.pullRequest.number,
        title: r.pullRequest.title,
        lines: r.pullRequest.linesAdded + r.pullRequest.linesDeleted,
        provider: (r as any).provider || 'openai',
        model: r.model,
        costUsd: r.costUsd,
        actualCostUsd: r.actualCostUsd,
        insights: (r as any).insights,
      }))

    // Cost breakdown by provider and model
    const costByModel: Record<string, { cost: number; count: number }> = {}
    usageRecords.forEach(r => {
      const key = `${(r as any).provider || 'openai'}-${r.model}`
      if (!costByModel[key]) costByModel[key] = { cost: 0, count: 0 }
      costByModel[key].cost += r.costUsd
      costByModel[key].count += 1
    })

    const modelBreakdown = Object.entries(costByModel)
      .sort(([, a], [, b]) => b.cost - a.cost)
      .map(([key, data]) => ({
        model: key,
        cost: Math.round(data.cost * 100) / 100,
        count: data.count,
        percentage: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
      }))

    return Response.json({
      totalCost,
      bucketChartData,
      trendData,
      topPrs,
      modelBreakdown,
    })
  } catch (error) {
    console.error('Cost API error:', error)
    return Response.json({ error: 'Failed to load cost data' }, { status: 500 })
  }
}
