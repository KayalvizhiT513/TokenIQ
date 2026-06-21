import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { fetchPullRequests } from '@/lib/github'
import { deriveUsage } from '@/lib/generator'
import { fetchOpenAIUsage, estimateActualCost } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { repoId } = await req.json()

    if (!repoId) {
      return NextResponse.json(
        { error: 'Repository ID required' },
        { status: 400 }
      )
    }

    // Get the repository
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
    })

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    // Decrypt the PAT
    let pat: string
    try {
      pat = decrypt(repo.encryptedPat)
    } catch (err) {
      console.error('Failed to decrypt PAT:', err)
      return NextResponse.json(
        { error: 'Failed to decrypt repository credentials' },
        { status: 500 }
      )
    }

    // Fetch PRs from GitHub
    let pullRequests
    try {
      pullRequests = await fetchPullRequests(repo.owner, repo.name, pat, 100)
    } catch (err) {
      console.error('GitHub fetch error:', err)
      return NextResponse.json(
        { error: `Failed to fetch from GitHub: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Check if there's an OpenAI integration for this org
    let openaiApiKey: string | null = null
    let openaiUsageData: any = null

    try {
      const integration = await prisma.integration.findUnique({
        where: { orgId_provider: { orgId: repo.orgId, provider: 'openai' } },
      })

      if (integration) {
        openaiApiKey = decrypt(integration.encryptedApiKey)

        // Fetch OpenAI usage data for the date range of these PRs
        if (pullRequests.length > 0) {
          const mergedPrs = pullRequests.filter(pr => pr.mergedAt)
          console.log(`Found ${mergedPrs.length} merged PRs out of ${pullRequests.length}`)

          const dates = mergedPrs.map(pr => pr.mergedAt!.getTime())

          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates))
            const maxDate = new Date(Math.max(...dates))

            // Fetch usage for a wider range (7 days before to 7 days after)
            const startDate = new Date(minDate)
            startDate.setDate(startDate.getDate() - 7)
            const endDate = new Date(maxDate)
            endDate.setDate(endDate.getDate() + 7)

            console.log(`Fetching OpenAI usage from ${startDate.toISOString()} to ${endDate.toISOString()}`)
            openaiUsageData = await fetchOpenAIUsage(openaiApiKey, startDate, endDate)
            console.log('OpenAI usage data:', openaiUsageData ? `success - ${openaiUsageData.data?.length || 0} records` : 'failed')
          } else {
            console.log('No merged PRs found - skipping OpenAI usage fetch')
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch OpenAI data:', err)
      // Continue without actual costs
    }

    // Calculate total estimated tokens for proportional allocation
    let totalEstimatedTokens = 0
    const estimatedUsages = pullRequests.map(pr => {
      const usage = deriveUsage({
        linesAdded: pr.linesAdded,
        linesDeleted: pr.linesDeleted,
      })
      totalEstimatedTokens += usage.inputTokens + usage.outputTokens
      return usage
    })

    // Upsert PRs and generate usage records
    let createdCount = 0
    let updatedCount = 0

    for (let i = 0; i < pullRequests.length; i++) {
      const pr = pullRequests[i]
      const usage = estimatedUsages[i]

      // Calculate merge time in minutes
      const minutesToMerge = pr.mergedAt
        ? Math.round((pr.mergedAt.getTime() - pr.openedAt.getTime()) / (1000 * 60))
        : null

      // Upsert PR
      const dbPr = await prisma.pullRequest.upsert({
        where: {
          id: `${repo.id}-${pr.number}`,
        },
        update: {
          title: pr.title,
          author: pr.author,
          filesChanged: pr.filesChanged,
          linesAdded: pr.linesAdded,
          linesDeleted: pr.linesDeleted,
          mergedAt: pr.mergedAt,
          minutesToMerge,
        },
        create: {
          id: `${repo.id}-${pr.number}`,
          repositoryId: repo.id,
          number: pr.number,
          title: pr.title,
          author: pr.author,
          filesChanged: pr.filesChanged,
          linesAdded: pr.linesAdded,
          linesDeleted: pr.linesDeleted,
          openedAt: pr.openedAt,
          mergedAt: pr.mergedAt,
          minutesToMerge,
        },
      })

      // Calculate actual costs if OpenAI data is available
      let actualCostData: { actualCost: number; actualTokens: number } | null = null
      if (openaiUsageData) {
        const prTotalEstimatedTokens = usage.inputTokens + usage.outputTokens
        actualCostData = estimateActualCost(
          usage.inputTokens,
          usage.outputTokens,
          openaiUsageData,
          totalEstimatedTokens,
          prTotalEstimatedTokens
        )
      }

      // Upsert usage record
      const existingUsage = await prisma.usageRecord.findUnique({
        where: { pullRequestId: dbPr.id },
      })

      const usageData = {
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        costUsd: usage.costUsd,
        actualCostUsd: actualCostData?.actualCost || null,
        actualInputTokens: actualCostData?.actualTokens ? Math.round(actualCostData.actualTokens * 0.75) : null,
        actualOutputTokens: actualCostData?.actualTokens ? Math.round(actualCostData.actualTokens * 0.25) : null,
      }

      if (existingUsage) {
        await prisma.usageRecord.update({
          where: { pullRequestId: dbPr.id },
          data: usageData,
        })
        updatedCount++
      } else {
        await prisma.usageRecord.create({
          data: {
            pullRequestId: dbPr.id,
            ...usageData,
          },
        })
        createdCount++
      }
    }

    // Update repo sync time
    await prisma.repository.update({
      where: { id: repo.id },
      data: { lastSyncedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `Synced ${createdCount} new PRs and updated ${updatedCount} existing PRs${openaiUsageData ? ' with actual cost data' : ''}`,
      prCount: pullRequests.length,
      createdCount,
      updatedCount,
      withActualCosts: !!openaiUsageData,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync repository' },
      { status: 500 }
    )
  }
}
