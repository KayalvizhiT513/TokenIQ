import { prisma } from '@/lib/db'

export type UsageEventInput = {
  provider: string
  model: string
  modelVersion?: string
  requestId?: string
  traceId?: string
  spanId?: string
  sourceEventId?: string
  startedAt: Date
  endedAt?: Date
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
  totalTokens?: number
  costUsd?: number
  statusCode?: number
  metadata?: Record<string, unknown>
}

export async function ingestUsageEvents(
  orgId: string,
  events: UsageEventInput[],
  integrationId?: string,
) {
  let created = 0
  let updated = 0

  for (const event of events) {
    const inputTokens = event.inputTokens ?? 0
    const outputTokens = event.outputTokens ?? 0
    const cachedTokens = event.cachedTokens ?? 0
    const data = {
      integrationId,
      provider: event.provider.toLowerCase(),
      model: event.model,
      modelVersion: event.modelVersion,
      requestId: event.requestId,
      traceId: event.traceId,
      spanId: event.spanId,
      startedAt: event.startedAt,
      endedAt: event.endedAt,
      latencyMs: event.latencyMs,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens: event.totalTokens ?? inputTokens + outputTokens,
      costUsd: event.costUsd,
      statusCode: event.statusCode,
      metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
    }

    if (event.sourceEventId) {
      const existing = await prisma.usageEvent.findUnique({
        where: { orgId_sourceEventId: { orgId, sourceEventId: event.sourceEventId } },
      })
      if (existing) {
        await prisma.usageEvent.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.usageEvent.create({ data: { orgId, sourceEventId: event.sourceEventId, ...data } })
        created++
      }
    } else {
      await prisma.usageEvent.create({ data: { orgId, ...data } })
      created++
    }
  }

  return { created, updated }
}

const openAIRatesPerMillion: Record<string, { input: number; output: number; cached: number }> = {
  'gpt-4o': { input: 2.5, output: 10, cached: 1.25 },
  'gpt-4o-mini': { input: 0.15, output: 0.6, cached: 0.075 },
}

function estimateCost(model: string, input: number, output: number, cached: number) {
  const rate = openAIRatesPerMillion[model]
  if (!rate) return undefined
  return (Math.max(0, input - cached) * rate.input + output * rate.output + cached * rate.cached) / 1_000_000
}

type OpenAIUsageBucket = {
  start_time: number
  end_time?: number
  results?: Array<Record<string, unknown>>
}

/** Fetches real OpenAI organization usage. Requires an Admin API key. */
export async function collectOpenAIUsage(apiKey: string, startTime: Date, endTime: Date) {
  const url = new URL('https://api.openai.com/v1/organization/usage/completions')
  url.searchParams.set('start_time', String(Math.floor(startTime.getTime() / 1000)))
  url.searchParams.set('end_time', String(Math.floor(endTime.getTime() / 1000)))
  url.searchParams.set('bucket_width', '1h')
  url.searchParams.append('group_by', 'model')
  url.searchParams.set('limit', '31')

  const events: UsageEventInput[] = []
  let page: string | undefined
  do {
    if (page) url.searchParams.set('page', page)
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!response.ok) {
      throw new Error(`OpenAI usage request failed (${response.status}): ${await response.text()}`)
    }
    const payload = (await response.json()) as { data?: OpenAIUsageBucket[]; has_more?: boolean; next_page?: string }
    for (const bucket of payload.data ?? []) {
      for (const result of bucket.results ?? []) {
        const model = typeof result.model === 'string' && result.model ? result.model : 'unknown'
        const inputTokens = Number(result.input_tokens ?? 0)
        const outputTokens = Number(result.output_tokens ?? 0)
        const cachedTokens = Number(result.input_cached_tokens ?? 0)
        events.push({
          provider: 'openai',
          model,
          sourceEventId: `openai:${bucket.start_time}:${bucket.end_time ?? ''}:${model}`,
          startedAt: new Date(bucket.start_time * 1000),
          endedAt: bucket.end_time ? new Date(bucket.end_time * 1000) : undefined,
          inputTokens,
          outputTokens,
          cachedTokens,
          totalTokens: inputTokens + outputTokens,
          costUsd: estimateCost(model, inputTokens, outputTokens, cachedTokens),
          metadata: { source: 'openai.organization.usage.completions', aggregate: true },
        })
      }
    }
    page = payload.has_more ? payload.next_page : undefined
  } while (page)

  return events
}
