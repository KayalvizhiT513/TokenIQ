import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email(), password: z.string().min(8).max(128) })

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = schema.parse(await request.json())
    const normalizedEmail = email.toLowerCase()
    if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 })
    const passwordHash = await bcrypt.hash(password, 12)
    const suffix = crypto.randomUUID().slice(0, 8)
    await prisma.organization.create({ data: {
      name: `${name}'s workspace`, slug: `workspace-${suffix}`,
      users: { create: { name, email: normalizedEmail, passwordHash, role: 'admin' } },
      modelConfigs: { create: [
        { provider: 'openai', model: 'gpt-4o-mini', inputCostPerMillion: 0.15, outputCostPerMillion: 0.6, cachedCostPerMillion: 0.075, isDefault: true },
        { provider: 'openai', model: 'gpt-4o', inputCostPerMillion: 2.5, outputCostPerMillion: 10, cachedCostPerMillion: 1.25 },
        { provider: 'anthropic', model: 'claude-3-5-sonnet', inputCostPerMillion: 3, outputCostPerMillion: 15, cachedCostPerMillion: 0.3 },
      ] },
    } })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : 'Unable to create account.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
