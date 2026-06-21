'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ModelData {
  modelStats: any[]
  costPieData: any[]
  countPieData: any[]
  authorGpt4Usage: any[]
}

const COLORS = ['#2563eb', '#10b981']

export default function ModelDistributionPage() {
  const [data, setData] = useState<ModelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/models').then(res => res.json()).then(d => { setData(d); setLoading(false) }).catch(err => { console.error(err); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (!data) return <div className="p-8 text-center">Failed to load</div>

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Model Distribution</h1>
        <p className="text-slate-600">Which AI models are being used and costs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.modelStats.map((stat: any) => (
          <Card key={stat.model}>
            <CardHeader className="pb-2">
              <CardTitle>{stat.model}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><p className="text-sm text-slate-600">PR Count</p><p className="text-2xl font-bold">{stat.count}</p></div>
              <div><p className="text-sm text-slate-600">Total Cost</p><p className="text-2xl font-bold">${(stat.totalCost).toFixed(2)}</p></div>
              <div><p className="text-sm text-slate-600">Avg Tokens</p><p className="font-mono">{stat.avgTokens.toLocaleString()}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.costPieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PR Count Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.countPieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authors Using GPT-4o Most</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">GPT-4o</TableHead>
                <TableHead className="text-right">GPT-4o-mini</TableHead>
                <TableHead className="text-right">% GPT-4o</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.authorGpt4Usage.map((item: any) => (
                <TableRow key={item.author}>
                  <TableCell>{item.author}</TableCell>
                  <TableCell className="text-right">{item.gpt4Count}</TableCell>
                  <TableCell className="text-right">{item.miniCount}</TableCell>
                  <TableCell className="text-right"><Badge>{Math.round(item.gpt4Percent)}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
