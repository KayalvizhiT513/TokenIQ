import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ingestUsageEvents } from '@/lib/usage-collector'

const eventSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  modelVersion: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  sourceEventId: z.string().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  cachedTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().nonnegative().optional(),
  statusCode: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const bodySchema = z.object({ orgId: z.string().optional(), events: z.array(eventSchema).min(1).max(1000) })

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.parse(await request.json())
    const org = parsed.orgId
      ? await prisma.organization.findUnique({ where: { id: parsed.orgId } })
      : await prisma.organization.findFirst()
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const result = await ingestUsageEvents(org.id, parsed.events)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues.map(issue => issue.message).join(', ') : 'Failed to ingest usage events'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
