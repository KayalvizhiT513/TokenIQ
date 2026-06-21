'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface ComparisonStats {
  totalRecords: number
  recordsWithActualCosts: number
  estimatedTotal: number
  actualTotal: number
  variance: number
  accuracyPercentage: number
}

interface ComparisonRow {
  id: string
  prNumber: number
  prTitle: string
  estimatedCost: number
  actualCost: number
  variance: number
  variancePercent: number
  estimatedTokens: number
  actualTokens: number | null
  provider: string
  model: string
  insights: string | null
}

export default function CostComparisonPage() {
  const [stats, setStats] = useState<ComparisonStats | null>(null)
  const [data, setData] = useState<ComparisonRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComparison()
  }, [])

  const loadComparison = async () => {
    try {
      const res = await fetch('/api/cost-comparison')
      const result = await res.json()
      setStats(result.stats)
      setData(result.comparisonData)
    } catch (err) {
      console.error('Failed to load comparison:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading...</div>
  }

  if (!stats) {
    return <div className="p-8 text-center text-slate-600">Failed to load data</div>
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cost Verification</h1>
        <p className="text-slate-600 mt-1">
          Compare estimated costs (from PR metadata) vs actual costs from OpenAI
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Estimated Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.estimatedTotal.toFixed(2)}</div>
            <p className="text-xs text-slate-600 mt-1">{stats.totalRecords} PRs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Actual Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.recordsWithActualCosts > 0 ? `$${stats.actualTotal.toFixed(2)}` : 'N/A'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.recordsWithActualCosts} PRs with data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.variance > 0 ? '+' : ''} ${Math.abs(stats.variance).toFixed(2)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {stats.variance > 0 ? 'Overestimated' : 'Underestimated'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.recordsWithActualCosts > 0 ? `${stats.accuracyPercentage}%` : 'N/A'}
            </div>
            <p className="text-xs text-slate-600 mt-1">Algorithm accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Insights */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.slice(0, 10).map(row => (
                <div key={row.id} className="border rounded-lg p-3 bg-slate-50 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold">PR #{row.prNumber}</div>
                      <div className="text-xs text-slate-600 line-clamp-2">{row.prTitle}</div>
                    </div>
                    <Badge variant="outline" className="whitespace-nowrap ml-2">
                      {row.provider}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{row.model}</Badge>
                    {row.variance !== 0 && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${row.variance > 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {row.variance > 0 ? '+' : ''}{row.variancePercent}%
                      </Badge>
                    )}
                  </div>
                  {row.insights && (
                    <p className="text-xs text-slate-700 italic">{row.insights}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Estimated vs Actual Comparison
            {stats.recordsWithActualCosts === 0 && (
              <p className="text-sm font-normal text-slate-600 mt-2">
                Add an OpenAI integration and sync a repository to see actual costs
              </p>
            )}
          </CardTitle>
        </CardHeader>
        {data.length > 0 ? (
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Est. Tokens</TableHead>
                    <TableHead className="text-right">Act. Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">#{row.prNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.prTitle}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${row.estimatedCost.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${row.actualCost.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={row.variance > 0 ? 'text-red-600' : 'text-green-600'}
                        >
                          {row.variance > 0 ? '+' : ''}${Math.abs(row.variance).toFixed(4)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={row.variancePercent > 0 ? 'text-red-600' : 'text-green-600'}
                        >
                          {row.variancePercent > 0 ? '+' : ''}{row.variancePercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.estimatedTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.actualTokens ? row.actualTokens.toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-center text-slate-600 py-8">
              No cost data available yet. Add an OpenAI integration and sync a repository to start
              comparing costs.
            </p>
          </CardContent>
        )}
      </Card>

      {/* How it works */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">How Cost Verification Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-3">
          <p>
            <strong>Estimated Costs:</strong> Calculated from PR metadata (lines changed, files
            modified) using a proportional algorithm.
          </p>
          <p>
            <strong>Actual Costs:</strong> Fetched from OpenAI's usage API when you connect your
            API key and sync. Allocated proportionally across PRs.
          </p>
          <p>
            <strong>Why Compare?</strong> This helps you validate the accuracy of the estimation
            algorithm and tune it for your team's specific patterns.
          </p>
          <p>
            <strong>Note:</strong> Actual costs are proportionally allocated across PRs based on
            estimated tokens, since OpenAI's API provides aggregate usage data, not per-request
            breakdowns.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
