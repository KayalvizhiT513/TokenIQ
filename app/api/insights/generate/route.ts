import { prisma } from '@/lib/db'
import { usageRecordVisibilityFilter } from '@/lib/demo-data'
import { decrypt } from '@/lib/crypto'
import { generateInsight } from '@/lib/insight-generation'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const requestedLimit = Number(body.limit ?? 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 25) : 10
    const integration = await prisma.integration.findFirst({
      where: { provider: 'openai', isActive: true },
    })
    if (!integration) return NextResponse.json({ error: 'Connect an active OpenAI integration before generating insights.' }, { status: 400 })

    const records = await prisma.usageRecord.findMany({
      where: { ...usageRecordVisibilityFilter, insights: null },
      include: { pullRequest: true },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    })
    if (records.length === 0) return NextResponse.json({ success: true, generated: 0, message: 'No unprocessed live PRs need insights.' })

    const apiKey = decrypt(integration.encryptedApiKey)
    let generated = 0
    const failures: string[] = []
    for (const record of records) {
      try {
        const insight = await generateInsight(apiKey, {
          title: record.pullRequest.title,
          linesAdded: record.pullRequest.linesAdded,
          linesDeleted: record.pullRequest.linesDeleted,
          filesChanged: record.pullRequest.filesChanged,
          provider: record.provider,
          model: record.model,
          estimatedCost: record.costUsd,
        })
        await prisma.usageRecord.update({ where: { id: record.id }, data: { insights: insight } })
        generated++
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Unknown insight generation error')
      }
    }

    if (generated === 0 && failures.length > 0) {
      return NextResponse.json({ error: failures[0], attempted: records.length }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      generated,
      attempted: records.length,
      failures,
      message: `Generated insights for ${generated} of ${records.length} PRs.`,
    })
  } catch (error) {
    console.error('Insights check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
