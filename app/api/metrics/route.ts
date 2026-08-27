import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const round = (value: number) => Math.round(value * 10000) / 10000

export async function GET(request: NextRequest) {
  try {
    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days') ?? 30), 1), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const events = await prisma.usageEvent.findMany({ where: { startedAt: { gte: since } }, orderBy: { startedAt: 'desc' } })
    const totals = events.reduce(
      (acc, event) => ({
        requests: acc.requests + 1,
        inputTokens: acc.inputTokens + event.inputTokens,
        outputTokens: acc.outputTokens + event.outputTokens,
        cachedTokens: acc.cachedTokens + event.cachedTokens,
        totalTokens: acc.totalTokens + event.totalTokens,
        costUsd: acc.costUsd + (event.costUsd ?? 0),
        latencyTotal: acc.latencyTotal + (event.latencyMs ?? 0),
        latencyCount: acc.latencyCount + (event.latencyMs === null ? 0 : 1),
        errors: acc.errors + (event.statusCode && event.statusCode >= 400 ? 1 : 0),
      }),
      { requests: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0, costUsd: 0, latencyTotal: 0, latencyCount: 0, errors: 0 },
    )
    const byModel = new Map<string, { provider: string; model: string; modelVersion: string | null; requests: number; tokens: number; costUsd: number; latency: number; latencyCount: number }>()
    const traces = new Map<string, { traceId: string; requests: number; totalTokens: number; latencyMs: number; latestAt: Date; provider: string; model: string }>()
    for (const event of events) {
      const key = `${event.provider}:${event.model}:${event.modelVersion ?? ''}`
      const model = byModel.get(key) ?? { provider: event.provider, model: event.model, modelVersion: event.modelVersion, requests: 0, tokens: 0, costUsd: 0, latency: 0, latencyCount: 0 }
      model.requests++
      model.tokens += event.totalTokens
      model.costUsd += event.costUsd ?? 0
      if (event.latencyMs !== null) { model.latency += event.latencyMs; model.latencyCount++ }
      byModel.set(key, model)
      if (event.traceId) {
        const trace = traces.get(event.traceId) ?? { traceId: event.traceId, requests: 0, totalTokens: 0, latencyMs: 0, latestAt: event.startedAt, provider: event.provider, model: event.model }
        trace.requests++
        trace.totalTokens += event.totalTokens
        trace.latencyMs += event.latencyMs ?? 0
        if (event.startedAt > trace.latestAt) trace.latestAt = event.startedAt
        traces.set(event.traceId, trace)
      }
    }
    return NextResponse.json({
      window: { since, days },
      totals: { ...totals, costUsd: round(totals.costUsd), avgLatencyMs: totals.latencyCount ? Math.round(totals.latencyTotal / totals.latencyCount) : null, errorRate: totals.requests ? round((totals.errors / totals.requests) * 100) : 0 },
      models: [...byModel.values()].map(model => ({ ...model, costUsd: round(model.costUsd), avgLatencyMs: model.latencyCount ? Math.round(model.latency / model.latencyCount) : null })).sort((a, b) => b.costUsd - a.costUsd || b.tokens - a.tokens),
      traces: [...traces.values()].sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime()).slice(0, 50),
      recentEvents: events.slice(0, 50).map(event => ({ ...event, metadata: event.metadata ? JSON.parse(event.metadata) : null })),
    })
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json({ error: 'Failed to load usage metrics' }, { status: 500 })
  }
}
