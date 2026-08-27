type InsightInput = {
  title: string
  linesAdded: number
  linesDeleted: number
  filesChanged: number
  provider: string
  model: string
  estimatedCost: number
}

export async function generateInsight(apiKey: string, input: InsightInput) {
  const lines = input.linesAdded + input.linesDeleted
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Write one concise, evidence-based sentence about this AI-assisted code-review estimate. Do not invent measured quality, actual cost, or latency.\nPR: ${input.title}\nChanged lines: ${lines} (${input.linesAdded} added, ${input.linesDeleted} deleted)\nFiles: ${input.filesChanged}\nAttributed provider/model: ${input.provider}/${input.model}\nEstimated cost: $${input.estimatedCost.toFixed(4)}`,
      }],
      max_tokens: 70,
      temperature: 0.2,
    }),
  })
  if (!response.ok) throw new Error(`OpenAI insight request failed (${response.status}): ${await response.text()}`)
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const insight = payload.choices?.[0]?.message?.content?.trim()
  if (!insight) throw new Error('OpenAI returned an empty insight')
  return insight
}
