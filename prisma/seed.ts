import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { deriveUsage } from '../lib/generator'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean up existing data
  await prisma.usageRecord.deleteMany()
  await prisma.pullRequest.deleteMany()
  await prisma.repository.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Corp',
      slug: 'demo-corp',
    },
  })

  // Create user
  const hashedPassword = await bcrypt.hash('demo123', 10)
  const user = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Demo User',
      email: 'demo@example.com',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  })

  // Create repository (demo, no PAT)
  const repo = await prisma.repository.create({
    data: {
      orgId: org.id,
      owner: 'anthropics',
      name: 'anthropic-sdk-python',
      encryptedPat: '', // not actually used in seed
    },
  })

  // Generate 200 synthetic PRs with realistic distribution
  const pullRequests = generateSyntheticPRs(200)

  for (const prData of pullRequests) {
    const pr = await prisma.pullRequest.create({
      data: {
        repositoryId: repo.id,
        ...prData,
      },
    })

    // Generate usage from PR metadata
    const usage = deriveUsage(pr)

    await prisma.usageRecord.create({
      data: {
        pullRequestId: pr.id,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        costUsd: usage.costUsd,
        isSynthetic: true,
      },
    })
  }

  console.log('Seeding complete!')
  console.log(`- Organization: ${org.name}`)
  console.log(`- User: ${user.email} (password: demo123)`)
  console.log(`- Repository: ${repo.owner}/${repo.name}`)
  console.log(`- PRs: ${pullRequests.length}`)
}

function generateSyntheticPRs(count: number) {
  const now = new Date()
  const prs: Array<{
    number: number
    title: string
    author: string
    filesChanged: number
    linesAdded: number
    linesDeleted: number
    mergedAt: Date
    openedAt: Date
    minutesToMerge: number
  }> = []

  const authors = [
    'alice',
    'bob',
    'charlie',
    'diana',
    'eve',
    'frank',
    'grace',
    'henry',
  ]
  const titles = [
    'Fix: handle null values in parser',
    'Feature: add streaming support',
    'Refactor: improve type safety',
    'Docs: update API guide',
    'Test: add coverage for edge cases',
    'Perf: optimize token counting',
    'Chore: upgrade dependencies',
    'Fix: race condition in cache',
  ]

  for (let i = 0; i < count; i++) {
    // Realistic distribution: most PRs are small (0-100 lines), a few large ones
    const rand = Math.random()
    let lines: number
    if (rand < 0.6) {
      lines = Math.floor(Math.random() * 100) // 0-100 lines
    } else if (rand < 0.9) {
      lines = 100 + Math.floor(Math.random() * 200) // 100-300 lines
    } else {
      lines = 300 + Math.floor(Math.random() * 1700) // 300-2000 lines
    }

    const filesChanged = Math.max(1, Math.floor(lines / 50))
    const linesAdded = Math.floor(lines * 0.7)
    const linesDeleted = Math.floor(lines * 0.3)

    // PRs merged between 1 minute and 30 days ago
    const daysAgo = Math.floor(Math.random() * 90)
    const openedAt = new Date(now)
    openedAt.setDate(openedAt.getDate() - daysAgo)

    // Time to merge: 1 minute to 7 days
    const minutesToMerge = 1 + Math.floor(Math.random() * 10080)
    const mergedAt = new Date(openedAt)
    mergedAt.setMinutes(mergedAt.getMinutes() + minutesToMerge)

    prs.push({
      number: 1000 + i,
      title: titles[Math.floor(Math.random() * titles.length)],
      author: authors[Math.floor(Math.random() * authors.length)],
      filesChanged,
      linesAdded,
      linesDeleted,
      openedAt,
      mergedAt,
      minutesToMerge,
    })
  }

  return prs
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
