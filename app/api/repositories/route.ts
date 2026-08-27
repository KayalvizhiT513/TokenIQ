import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { currentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const repos = await prisma.repository.findMany({
      where: { orgId: user.orgId },
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
        isDemo: r.encryptedPat === '',
      }))
    )
  } catch (error) {
    console.error('Repos fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { repoId } = await req.json()

    if (!repoId) {
      return NextResponse.json({ error: 'Repository ID required' }, { status: 400 })
    }

    const repo = await prisma.repository.findFirst({ where: { id: repoId, orgId: user.orgId } })
    if (!repo) return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    await prisma.repository.delete({ where: { id: repo.id } })

    return NextResponse.json({ message: 'Repository removed' })
  } catch (error) {
    console.error('Repository delete error:', error)
    return NextResponse.json({ error: 'Failed to remove repository' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { owner, name, pat, modelConfigId } = await req.json()

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

    // Check if this repo already exists
    const existing = await prisma.repository.findFirst({
      where: {
        owner: owner,
        name: name,
        orgId: user.orgId,
      },
    })

    if (existing) {
      // Update existing
      const updated = await prisma.repository.update({
        where: { id: existing.id },
        data: { encryptedPat, modelConfigId: modelConfigId || null, lastSyncedAt: new Date() },
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
        orgId: user.orgId,
        owner,
        name,
          encryptedPat,
          modelConfigId: modelConfigId || null,
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
