import { prisma } from '@/lib/db'
import { usageRecordVisibilityFilter } from '@/lib/demo-data'

export async function GET() {
  try {
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

    const scatterData = usageRecords.map((r) => ({
      x: r.pullRequest.linesAdded + r.pullRequest.linesDeleted,
      y: r.inputTokens,
      model: r.model,
      prNumber: r.pullRequest.number,
      prTitle: r.pullRequest.title,
    }))

    const mergeTimeByModel: Record<string, { total: number; count: number }> = {}
    usageRecords.forEach((r) => {
      if (r.pullRequest.minutesToMerge) {
        if (!mergeTimeByModel[r.model]) {
          mergeTimeByModel[r.model] = { total: 0, count: 0 }
        }
        mergeTimeByModel[r.model].total += r.pullRequest.minutesToMerge
        mergeTimeByModel[r.model].count += 1
      }
    })

    const avgMergeTimeByModel = Object.entries(mergeTimeByModel).map(
      ([model, { total, count }]) => ({
        model,
        avgMinutes: Math.round(total / count),
        avgHours: Math.round((total / count / 60) * 10) / 10,
      }),
    )

    return Response.json({
      scatterData,
      avgMergeTimeByModel,
      recordsForTable: usageRecords.slice(0, 20).map(r => ({
        id: r.id,
        number: r.pullRequest.number,
        title: r.pullRequest.title,
        author: r.pullRequest.author,
        linesAdded: r.pullRequest.linesAdded,
        linesDeleted: r.pullRequest.linesDeleted,
        model: r.model,
        inputTokens: r.inputTokens,
        costUsd: r.costUsd,
        minutesToMerge: r.pullRequest.minutesToMerge,
      })),
      totalRecords: usageRecords.length,
    })
  } catch (error) {
    console.error('PR Analytics API error:', error)
    return Response.json({ error: 'Failed to load PR data' }, { status: 500 })
  }
}
