export interface OpenAIUsageResponse {
  object: string
  data: Array<{
    timestamp: number
    completion_tokens_details: {
      cached_creation_input_tokens: number
      text_completion_tokens: number
    }
    prompt_tokens_details: {
      cached_tokens: number
      text_tokens: number
    }
    prompt_tokens: number
    completion_tokens: number
    fine_tuning_tokens: number
    total_tokens: number
  }>
  total_usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

export async function fetchOpenAIUsage(apiKey: string, startDate: Date, endDate: Date) {
  try {
    const allData: OpenAIUsageResponse['data'] = []
    let currentDate = new Date(startDate)

    // Query each day individually
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const url = `https://api.openai.com/v1/usage?date=${dateStr}`

      console.log(`Fetching OpenAI usage for ${dateStr}`)
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`OpenAI API error for ${dateStr}: ${response.status} - ${errorText}`)
        // Continue with other dates even if one fails
      } else {
        const data: OpenAIUsageResponse = await response.json()
        if (data.data && data.data.length > 0) {
          allData.push(...data.data)
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (allData.length === 0) {
      console.log('No usage data found for the date range')
      return null
    }

    console.log(`OpenAI API returned ${allData.length} total usage records across ${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`)
    return { data: allData } as OpenAIUsageResponse
  } catch (error) {
    console.error('Failed to fetch OpenAI usage:', error)
    return null
  }
}

export function calculateOpenAIPricing(
  promptTokens: number,
  completionTokens: number,
  model: string = 'gpt-4o'
) {
  // OpenAI pricing as of June 2026 (per 1k tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': {
      input: 0.0025,
      output: 0.01,
    },
    'gpt-4o-mini': {
      input: 0.00015,
      output: 0.0006,
    },
    'gpt-4-turbo': {
      input: 0.01,
      output: 0.03,
    },
  }

  const rates = pricing[model] || pricing['gpt-4o']
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output
}

export function estimateActualCost(
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  actualUsageData: OpenAIUsageResponse | null,
  totalEstimatedTokens: number,
  prTotalEstimatedTokens: number
): { actualCost: number; actualTokens: number } | null {
  if (!actualUsageData?.data || actualUsageData.data.length === 0) {
    return null
  }

  // Sum up the actual tokens used
  let totalActualTokens = 0
  let totalActualCost = 0

  for (const entry of actualUsageData.data) {
    totalActualTokens += entry.total_tokens
    // Use the actual token counts for pricing
    const cost = calculateOpenAIPricing(entry.prompt_tokens, entry.completion_tokens)
    totalActualCost += cost
  }

  if (totalActualTokens === 0) return null

  // Allocate the total actual cost proportionally based on estimated tokens for this PR
  const prProportion = prTotalEstimatedTokens / totalEstimatedTokens
  const actualCostForPr = totalActualCost * prProportion
  const actualTokensForPr = Math.round(totalActualTokens * prProportion)

  return {
    actualCost: Math.round(actualCostForPr * 10000) / 10000,
    actualTokens: actualTokensForPr,
  }
}
