'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CostData {
  totalCost: number
  bucketChartData: any[]
  trendData: any[]
  topPrs: any[]
  modelBreakdown: any[]
}

export default function CostBreakdownPage() {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cost').then(res => res.json()).then(d => { setData(d); setLoading(false) }).catch(err => { console.error(err); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-600">Loading...</div>
  if (!data) return <div className="p-8 text-center text-slate-600">Failed to load</div>

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cost Breakdown</h1>
        <p className="text-slate-600 mt-1">AI costs across different dimensions</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Total AI Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">${Math.round(data.totalCost * 100) / 100}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost by PR Size</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.bucketChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#2563eb" name="Cost" />
                <Bar dataKey="count" fill="#10b981" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="daily" stroke="#2563eb" name="Daily" />
                <Line dataKey="cumulative" stroke="#10b981" name="Cumulative" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Usage Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.modelBreakdown.map((m: any) => (
                <TableRow key={m.model}>
                  <TableCell className="font-mono text-sm">{m.model}</TableCell>
                  <TableCell className="text-right">${m.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                  <TableCell className="text-right">{m.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Expensive PRs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topPrs.map((r: any) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-sm font-bold">PR #{r.number}</div>
                    <div className="text-sm text-slate-600 truncate">{r.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">${r.costUsd.toFixed(2)}</div>
                    {r.actualCostUsd && <div className="text-xs text-slate-500">actual: ${r.actualCostUsd.toFixed(2)}</div>}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline">{r.lines} lines</Badge>
                  <Badge>{r.provider}</Badge>
                  <Badge variant="secondary">{r.model}</Badge>
                </div>
                {r.insights && <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded">{r.insights}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
