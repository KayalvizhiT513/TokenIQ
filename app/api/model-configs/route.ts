import { prisma } from '@/lib/db'
import { currentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const models = await prisma.modelConfig.findMany({
    where: { orgId: user.orgId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { provider: 'asc' }, { model: 'asc' }],
  })
  return NextResponse.json(models)
}
