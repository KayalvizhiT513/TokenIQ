import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { collectOpenAIUsage, ingestUsageEvents } from '@/lib/usage-collector'

export async function POST(request: NextRequest) {
  try {
    const { integrationId, startDate, endDate } = await request.json()
    const integration = integrationId
      ? await prisma.integration.findUnique({ where: { id: integrationId } })
      : await prisma.integration.findFirst({ where: { provider: 'openai', isActive: true } })
    if (!integration) return NextResponse.json({ error: 'An active OpenAI integration is required' }, { status: 404 })
    if (integration.provider !== 'openai') return NextResponse.json({ error: 'Only OpenAI supports direct usage sync currently' }, { status: 400 })

    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: 'Use valid startDate and endDate values' }, { status: 400 })
    }

    const events = await collectOpenAIUsage(decrypt(integration.encryptedApiKey), start, end)
    const result = await ingestUsageEvents(integration.orgId, events, integration.id)
    await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncedAt: new Date(), lastSyncError: null } })
    return NextResponse.json({ success: true, events: events.length, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Usage sync failed'
    console.error('Usage sync error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
