import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

describe('API Integration Tests', () => {
  let orgId: string
  let userId: string

  beforeAll(async () => {
    // Clean up test data
    await prisma.usageRecord.deleteMany()
    await prisma.pullRequest.deleteMany()
    await prisma.repository.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
      },
    })
    orgId = org.id

    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10)
    const user = await prisma.user.create({
      data: {
        orgId,
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
      },
    })
    userId = user.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.usageRecord.deleteMany()
    await prisma.pullRequest.deleteMany()
    await prisma.repository.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.$disconnect()
  })

  it('should create and retrieve a repository', async () => {
    const repo = await prisma.repository.create({
      data: {
        orgId,
        owner: 'anthropics',
        name: 'sdk-python',
        encryptedPat: 'encrypted_test',
      },
    })

    expect(repo).toBeDefined()
    expect(repo.owner).toBe('anthropics')
    expect(repo.name).toBe('sdk-python')

    const retrieved = await prisma.repository.findUnique({
      where: { id: repo.id },
    })

    expect(retrieved).toBeDefined()
    expect(retrieved?.owner).toBe('anthropics')
  })

  it('should create and query pull requests with usage', async () => {
    const repo = await prisma.repository.create({
      data: {
        orgId,
        owner: 'test',
        name: 'repo',
        encryptedPat: 'test',
      },
    })

    const pr = await prisma.pullRequest.create({
      data: {
        repositoryId: repo.id,
        number: 1,
        title: 'Test PR',
        author: 'testauthor',
        filesChanged: 5,
        linesAdded: 100,
        linesDeleted: 50,
        openedAt: new Date(),
        mergedAt: new Date(),
        minutesToMerge: 30,
      },
    })

    const usage = await prisma.usageRecord.create({
      data: {
        pullRequestId: pr.id,
        model: 'gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 400,
        cachedInputTokens: 300,
        costUsd: 0.01,
      },
    })

    const retrieved = await prisma.usageRecord.findUnique({
      where: { id: usage.id },
      include: { pullRequest: { include: { repository: true } } },
    })

    expect(retrieved).toBeDefined()
    expect(retrieved?.model).toBe('gpt-4o-mini')
    expect(retrieved?.costUsd).toBe(0.01)
    expect(retrieved?.pullRequest.title).toBe('Test PR')
  })

  it('should aggregate usage records', async () => {
    const repo = await prisma.repository.create({
      data: {
        orgId,
        owner: 'agg-test',
        name: 'repo',
        encryptedPat: 'test',
      },
    })

    // Create multiple PRs with usage
    for (let i = 0; i < 3; i++) {
      const pr = await prisma.pullRequest.create({
        data: {
          repositoryId: repo.id,
          number: i + 100,
          title: `PR ${i}`,
          author: 'user',
          filesChanged: 5,
          linesAdded: 50 * (i + 1),
          linesDeleted: 25 * (i + 1),
          openedAt: new Date(),
          mergedAt: new Date(),
        },
      })

      await prisma.usageRecord.create({
        data: {
          pullRequestId: pr.id,
          model: i % 2 === 0 ? 'gpt-4o' : 'gpt-4o-mini',
          inputTokens: 1000 * (i + 1),
          outputTokens: 400 * (i + 1),
          cachedInputTokens: 300 * (i + 1),
          costUsd: 0.01 * (i + 1),
        },
      })
    }

    const records = await prisma.usageRecord.findMany({
      include: { pullRequest: true },
    })

    expect(records.length).toBeGreaterThanOrEqual(3)

    const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0)
    expect(totalCost).toBeGreaterThan(0)
  })
})
