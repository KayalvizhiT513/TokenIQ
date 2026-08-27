import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const integrations = await prisma.integration.findMany()

    return NextResponse.json(
      integrations.map(i => ({
        id: i.id,
        provider: i.provider,
        isActive: i.isActive,
        lastVerifiedAt: i.lastVerifiedAt,
        lastSyncedAt: i.lastSyncedAt,
        lastSyncError: i.lastSyncError,
        createdAt: i.createdAt,
      }))
    )
  } catch (error) {
    console.error('Integrations fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, orgId } = await req.json()

    if (!provider || (!apiKey && provider !== 'local')) {
      return NextResponse.json(
        { error: 'Provider and API key required' },
        { status: 400 }
      )
    }

    // Get the first org if not specified
    let org = orgId
    if (!org) {
      const firstOrg = await prisma.organization.findFirst()
      if (!firstOrg) {
        return NextResponse.json(
          { error: 'No organization found' },
          { status: 400 }
        )
      }
      org = firstOrg.id
    }

    // Encrypt the API key
    const encryptedApiKey = encrypt(apiKey || 'local-collector')

    // Verify providers without persisting or logging the submitted key.
    let lastVerifiedAt: Date | null = null
    if (provider === 'openai') {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        })
        if (response.ok) {
          lastVerifiedAt = new Date()
        } else {
          return NextResponse.json(
            { error: 'Invalid OpenAI API key' },
            { status: 400 }
          )
        }
      } catch (err) {
        console.error('OpenAI verification error:', err)
        return NextResponse.json(
          { error: 'Failed to verify OpenAI API key' },
          { status: 500 }
        )
      }
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      })
      if (!response.ok) return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 400 })
      lastVerifiedAt = new Date()
    } else if (provider !== 'local') {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    // Upsert the integration
    const integration = await prisma.integration.upsert({
      where: { orgId_provider: { orgId: org, provider } },
      update: {
        encryptedApiKey,
        lastVerifiedAt: lastVerifiedAt || new Date(),
        lastSyncError: null,
        isActive: true,
      },
      create: {
        orgId: org,
        provider,
        encryptedApiKey,
        lastVerifiedAt,
        isActive: true,
      },
    })

    return NextResponse.json({
      id: integration.id,
      provider: integration.provider,
      isActive: integration.isActive,
      lastVerifiedAt: integration.lastVerifiedAt,
      lastSyncedAt: integration.lastSyncedAt,
      message: 'Integration saved successfully',
    })
  } catch (error) {
    console.error('Integration create error:', error)
    return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { integrationId } = await req.json()

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID required' },
        { status: 400 }
      )
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    })

    return NextResponse.json({ message: 'Integration deleted' })
  } catch (error) {
    console.error('Integration delete error:', error)
    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
  }
}
