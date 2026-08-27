'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts'

interface DashboardData {
  totalCost: number
  prCount: number
  avgCostPerPr: number
  modelCounts: Record<string, number>
  topExpensivePrs: any[]
  costTrendData: any[]
  modelChartData: any[]
  telemetry: { requests: number; tokens: number; costUsd: number; avgLatencyMs: number | null }
}

const COLORS = ['#2563eb', '#10b981']

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center text-slate-600">Loading dashboard...</div>
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
        <h1 className="text-3xl font-bold">Executive Overview</h1>
        <p className="text-slate-600 mt-1">AI usage and cost analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total AI Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${Math.round(data.totalCost * 100) / 100}
            </div>
            <p className="text-xs text-slate-600 mt-1">{data.prCount} PRs analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Cost per PR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${Math.round(data.avgCostPerPr * 100) / 100}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Actual Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.telemetry.requests.toLocaleString()}</div>
            <p className="text-xs text-slate-600 mt-1">
              {data.telemetry.tokens.toLocaleString()} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Request Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.telemetry.avgLatencyMs ?? '—'}{data.telemetry.avgLatencyMs !== null ? ' ms' : ''}</div>
            <p className="text-xs text-slate-600 mt-1">
              Actual usage from connected collectors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Model Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.modelChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) => `${name}: $${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.modelChartData.map((_: any, index: number) => (
                    <div key={`cell-${index}`} style={{ color: COLORS[index] }} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.costTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  interval={Math.ceil(data.costTrendData.length / 7)}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="gpt-4o" fill="#2563eb" />
                <Bar dataKey="gpt-4o-mini" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Expensive PRs */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Most Expensive PRs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topExpensivePrs.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm">
                    #{record.pullRequest.number}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.pullRequest.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.model}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${Math.round(record.costUsd * 100) / 100}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
