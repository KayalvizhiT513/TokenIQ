import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { fetchPullRequests } from '@/lib/github'
import { deriveUsage } from '@/lib/generator'
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
    const repo = await prisma.repository.findUnique({ where: { id: repoId }, include: { modelConfig: true } })

    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    if (!repo.encryptedPat) {
      return NextResponse.json(
        { error: 'This is a demo repository with generated data. Remove it or connect the repository with a GitHub PAT before syncing.' },
        { status: 400 }
      )
    }

    const modelConfig = repo.modelConfig ?? await prisma.modelConfig.findFirst({
      where: { orgId: repo.orgId, isActive: true }, orderBy: { isDefault: 'desc' },
    })
    if (!modelConfig) {
      return NextResponse.json({ error: 'Add an active model in Model Analysis before syncing a repository.' }, { status: 400 })
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

    // PR estimates are deliberately kept separate from actual provider telemetry.
    const estimatedUsages = pullRequests.map(pr => {
      const usage = deriveUsage({
        linesAdded: pr.linesAdded,
        linesDeleted: pr.linesDeleted,
      }, modelConfig)
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
        actualCostUsd: null,
        actualInputTokens: null,
        actualOutputTokens: null,
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
      message: `Synced ${createdCount} new PRs and updated ${updatedCount} existing PRs. Provider telemetry is collected independently.`,
      prCount: pullRequests.length,
      createdCount,
      updatedCount,
      withActualCosts: false,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync repository' },
      { status: 500 }
    )
  }
}
