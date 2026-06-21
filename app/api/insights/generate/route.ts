import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Check how many PRs have insights
    const withInsights = await prisma.usageRecord.findMany({
      where: { insights: { not: null } },
    })

    const total = await prisma.usageRecord.count()

    return NextResponse.json({
      success: true,
      message: `${withInsights.length} out of ${total} PRs have AI-generated insights`,
      count: withInsights.length,
      total: total,
      status: withInsights.length === total ? 'complete' : 'partial',
    })
  } catch (error) {
    console.error('Insights check error:', error)
    return NextResponse.json(
      { error: 'Failed to check insights' },
      { status: 500 }
    )
  }
}
