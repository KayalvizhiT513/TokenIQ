import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const repos = await prisma.repository.findMany({
      include: {
        _count: {
          select: { pullRequests: true },
        },
      },
    })

    return NextResponse.json(
      repos.map(r => ({
        id: r.id,
        owner: r.owner,
        name: r.name,
        lastSyncedAt: r.lastSyncedAt,
        prCount: r._count.pullRequests,
      }))
    )
  } catch (error) {
    console.error('Repos fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { owner, name, pat } = await req.json()

    if (!owner || !name || !pat) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Encrypt the PAT before storing
    const encryptedPat = encrypt(pat)

    // Use a properly generated ID
    const id = `repo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Get the first org (should be the demo org from seeding)
    let org = await prisma.organization.findFirst()

    if (!org) {
      // Create a default org if none exists
      org = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org',
        },
      })
    }

    // Check if this repo already exists
    const existing = await prisma.repository.findFirst({
      where: {
        owner: owner,
        name: name,
        orgId: org.id,
      },
    })

    if (existing) {
      // Update existing
      const updated = await prisma.repository.update({
        where: { id: existing.id },
        data: { encryptedPat, lastSyncedAt: new Date() },
      })

      return NextResponse.json({
        id: updated.id,
        owner: updated.owner,
        name: updated.name,
        lastSyncedAt: updated.lastSyncedAt,
        prCount: 0,
      })
    }

    // Create new
    const repo = await prisma.repository.create({
      data: {
        id,
        orgId: org.id,
        owner,
        name,
        encryptedPat,
        lastSyncedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      lastSyncedAt: repo.lastSyncedAt,
      prCount: 0,
    })
  } catch (error) {
    console.error('Repo create error:', error)
    return NextResponse.json({ error: 'Failed to create repo' }, { status: 500 })
  }
}
