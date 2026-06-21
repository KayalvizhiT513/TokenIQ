import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : Buffer.alloc(32)

function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':')
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid ciphertext format')
  }
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

interface ModelMetrics {
  [model: string]: {
    count: number
    avgCost: number
    avgTokens: number
    totalVariance: number
  }
}

function groupByModel(records: any[]): ModelMetrics {
  const metrics: ModelMetrics = {}

  for (const record of records) {
    const model = record.model
    if (!metrics[model]) {
      metrics[model] = { count: 0, avgCost: 0, avgTokens: 0, totalVariance: 0 }
    }

    metrics[model].count += 1
    metrics[model].avgCost += record.costUsd
    metrics[model].avgTokens += record.inputTokens + record.outputTokens

    if (record.actualCostUsd) {
      const variance = Math.round(((record.actualCostUsd - record.costUsd) / record.costUsd) * 100)
      metrics[model].totalVariance += variance
    }
  }

  // Calculate averages
  for (const model in metrics) {
    metrics[model].avgCost = Math.round((metrics[model].avgCost / metrics[model].count) * 10000) / 10000
    metrics[model].avgTokens = Math.round(metrics[model].avgTokens / metrics[model].count)
  }

  return metrics
}

async function generateInsightWithOpenAI(openaiKey: string, prData: any, allMetrics: ModelMetrics): Promise<string | null> {
  try {
    const pr = prData.pullRequest
    const lines = pr.linesAdded + pr.linesDeleted
    const model = prData.model
    const provider = (prData as any).provider || 'openai'

    // Calculate variance
    let varianceText = ''
    if (prData.actualCostUsd) {
      const variance = Math.round(((prData.actualCostUsd - prData.costUsd) / prData.costUsd) * 100)
      varianceText = `\nCost variance: ${variance}% (${variance > 0 ? 'over' : 'under'}spent)`
    }

    const prompt = `Analyze this code review and provide a one-sentence insight about the AI model's performance:

PR: "${pr.title}"
Lines changed: ${lines} (added: ${pr.linesAdded}, deleted: ${pr.linesDeleted})
Files changed: ${pr.filesChanged}
Model used: ${model} (${provider})
Estimated cost: $${prData.costUsd.toFixed(4)}
${prData.actualCostUsd ? `Actual cost: $${prData.actualCostUsd.toFixed(4)}` : 'No actual cost data'}${varianceText}

Model average metrics:
${Object.entries(allMetrics)
  .map(([m, metrics]) => `- ${m}: avg $${metrics.avgCost}/PR`)
  .join('\n')}

IMPORTANT: If actual cost differs from estimated (variance shown above), mention the overspend/savings in your insight.
Provide ONE concise sentence (max 20 words) evaluating model efficiency, cost accuracy, and suitability.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`OpenAI error: ${response.status}`)
      return null
    }

    const data: any = await response.json()
    return data.choices[0]?.message?.content || null
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    return null
  }
}

async function updatePRInsights() {
  try {
    // Get OpenAI API key
    const integration = await prisma.integration.findFirst({
      where: { provider: 'openai' },
    })

    if (!integration) {
      throw new Error('No OpenAI integration found. Please add your OpenAI API key first.')
    }

    const openaiKey = decrypt(integration.encryptedApiKey)

    const records = await prisma.usageRecord.findMany({
      include: { pullRequest: true },
    })

    console.log(`Generating insights for ${records.length} records using OpenAI...`)

    const allMetrics = groupByModel(records)
    let updated = 0
    let failed = 0

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      process.stdout.write(`\rProcessing: ${i + 1}/${records.length}`)

      const insight = await generateInsightWithOpenAI(openaiKey, record, allMetrics)

      if (insight) {
        await prisma.usageRecord.update({
          where: { id: record.id },
          data: { insights: insight } as any,
        })
        updated++
      } else {
        failed++
      }

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`\n✓ Insights generation complete`)
    console.log(`  Updated: ${updated} PRs`)
    console.log(`  Failed: ${failed} PRs`)

    return { updated, failed }
  } catch (error) {
    console.error('Error updating PR insights:', error)
    throw error
  }
}

updatePRInsights()
  .then(result => {
    console.log('\n✓ All done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Failed:', error)
    process.exit(1)
  })
