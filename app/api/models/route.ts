import { prisma } from '@/lib/db'
import { usageRecordVisibilityFilter } from '@/lib/demo-data'

export async function GET() {
  try {
    const usageEvents = await prisma.usageEvent.findMany()
    const usageRecords = await prisma.usageRecord.findMany({
      where: usageRecordVisibilityFilter,
      include: { pullRequest: true },
    })

    const modelStats: Record<
      string,
      { count: number; totalCost: number; totalTokens: number; avgTokens: number }
    > = {}

    usageRecords.forEach((r) => {
      if (!modelStats[r.model]) {
        modelStats[r.model] = { count: 0, totalCost: 0, totalTokens: 0, avgTokens: 0 }
      }
      modelStats[r.model].count += 1
      modelStats[r.model].totalCost += r.costUsd
      modelStats[r.model].totalTokens += r.inputTokens
    })

    Object.keys(modelStats).forEach((model) => {
      modelStats[model].avgTokens = Math.round(
        modelStats[model].totalTokens / modelStats[model].count,
      )
    })

    const costPieData = Object.entries(modelStats).map(([model, stats]) => ({
      name: model,
      value: Math.round(stats.totalCost * 100) / 100,
    }))

    const countPieData = Object.entries(modelStats).map(([model, stats]) => ({
      name: model,
      value: stats.count,
    }))

    const authorModelUsage: Record<string, Record<string, number>> = {}

    usageRecords.forEach((r) => {
      const author = r.pullRequest.author
      if (!authorModelUsage[author]) {
        authorModelUsage[author] = {}
      }
      authorModelUsage[author][r.model] = (authorModelUsage[author][r.model] || 0) + 1
    })

    const authorGpt4Usage = Object.entries(authorModelUsage)
      .map(([author, models]) => ({
        author,
        gpt4Count: models['gpt-4o'] || 0,
        miniCount: models['gpt-4o-mini'] || 0,
        total: (models['gpt-4o'] || 0) + (models['gpt-4o-mini'] || 0),
        gpt4Percent:
          ((models['gpt-4o'] || 0) /
            ((models['gpt-4o'] || 0) + (models['gpt-4o-mini'] || 0))) *
          100,
      }))
      .filter((a) => a.total > 0)
      .sort((a, b) => b.gpt4Count - a.gpt4Count)

    const telemetryModels: Record<string, { provider: string; model: string; version: string | null; requests: number; tokens: number; totalCost: number; latencyTotal: number; latencyCount: number }> = {}
    usageEvents.forEach(event => {
      const key = `${event.provider}:${event.model}:${event.modelVersion ?? ''}`
      const stat = telemetryModels[key] ?? { provider: event.provider, model: event.model, version: event.modelVersion, requests: 0, tokens: 0, totalCost: 0, latencyTotal: 0, latencyCount: 0 }
      stat.requests++
      stat.tokens += event.totalTokens
      stat.totalCost += event.costUsd ?? 0
      if (event.latencyMs !== null) { stat.latencyTotal += event.latencyMs; stat.latencyCount++ }
      telemetryModels[key] = stat
    })
    return Response.json({
      modelStats: Object.entries(modelStats).map(([model, stats]) => ({
        model,
        ...stats,
      })),
      costPieData,
      countPieData,
      authorGpt4Usage: authorGpt4Usage.slice(0, 10),
      telemetryModels: Object.values(telemetryModels).map(stat => ({
        ...stat,
        avgLatencyMs: stat.latencyCount ? Math.round(stat.latencyTotal / stat.latencyCount) : null,
      })),
    })
  } catch (error) {
    console.error('Models API error:', error)
    return Response.json({ error: 'Failed to load model data' }, { status: 500 })
  }
}
