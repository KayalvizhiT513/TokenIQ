'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PRData {
  scatterData: any[]
  avgMergeTimeByModel: any[]
  recordsForTable: any[]
  totalRecords: number
}

export default function PRAnalyticsPage() {
  const [data, setData] = useState<PRData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/prs')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load PR data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center text-slate-600">Loading PR analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center text-slate-600">Failed to load data</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">PR Analytics</h1>
        <p className="text-slate-600 mt-1">
          Analyze the relationship between PR size and AI token usage
        </p>
      </div>

      {/* Scatter Chart - PR Size vs Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>PR Size vs Token Usage</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            X-axis: lines changed | Y-axis: input tokens | colored by model
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Lines Changed"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Input Tokens"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }: any) => {
                  if (active && payload && payload[0]) {
                    const d = payload[0].payload as typeof data.scatterData[0]
                    return (
                      <div className="bg-white p-2 border rounded shadow text-xs">
                        <p className="font-mono">PR #{d.prNumber}</p>
                        <p className="text-slate-600">{d.model}</p>
                        <p>Lines: {d.x}</p>
                        <p>Tokens: {d.y}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Scatter
                name="gpt-4o"
                data={data.scatterData.filter((d: any) => d.model === 'gpt-4o')}
                fill="#2563eb"
              />
              <Scatter
                name="gpt-4o-mini"
                data={data.scatterData.filter((d: any) => d.model === 'gpt-4o-mini')}
                fill="#10b981"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Merge Time Insight */}
      <Card>
        <CardHeader>
          <CardTitle>Merge Time by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {data.avgMergeTimeByModel.map((item: any) => (
              <div key={item.model} className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">{item.model}</p>
                <p className="text-2xl font-bold mt-2">{item.avgHours}h</p>
                <p className="text-xs text-slate-600 mt-1">
                  {item.avgMinutes} minutes average
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PR Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Pull Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Lines Changed</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Merge Time (h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recordsForTable.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">
                      #{record.number}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {record.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.author}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {record.linesAdded + record.linesDeleted}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.model}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {record.inputTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${Math.round(record.costUsd * 100) / 100}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {record.minutesToMerge
                        ? (record.minutesToMerge / 60).toFixed(1)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-slate-600 mt-4">
            Showing first 20 of {data.totalRecords} PRs
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
