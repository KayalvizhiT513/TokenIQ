'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react'

interface Integration {
  id: string
  provider: string
  isActive: boolean
  lastVerifiedAt: string | null
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('openai')

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations')
      const data = await res.json()
      setIntegrations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load integrations:', err)
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey) {
      alert('Please enter an API key')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setIntegrations([
          ...integrations.filter(i => i.provider !== selectedProvider),
          {
            id: result.id,
            provider: result.provider,
            isActive: result.isActive,
            lastVerifiedAt: result.lastVerifiedAt,
          },
        ])
        setApiKey('')
        setIsOpen(false)
        alert(`${selectedProvider} integration added successfully!`)
      } else {
        const error = await res.json()
        alert(`Failed: ${error.error}`)
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving integration')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) return

    try {
      const res = await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      })

      if (res.ok) {
        setIntegrations(integrations.filter(i => i.id !== integrationId))
        alert('Integration removed')
      } else {
        alert('Failed to delete integration')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Error deleting integration')
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading integrations...</div>
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-slate-600 mt-1">
            Connect your AI platform accounts to verify estimated costs
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic" disabled>
                    Anthropic (Coming soon)
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-600">
                  Your API key is encrypted and stored securely. Only used to verify costs.
                </p>
              </div>

              {selectedProvider === 'openai' && (
                <p className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                  Get your API key at:{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                </p>
              )}

              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? 'Verifying...' : 'Save Integration'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Integrations */}
      <div className="space-y-4">
        {integrations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-600">
                No integrations connected yet. Add one to start verifying costs.
              </p>
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="capitalize">{integration.provider} API</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {integration.lastVerifiedAt ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-sm text-green-600">
                              Verified{' '}
                              {new Date(integration.lastVerifiedAt).toLocaleDateString()}
                            </p>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <p className="text-sm text-yellow-600">Pending verification</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {integration.isActive && <Badge>Active</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* About Cost Verification */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">About Cost Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-3">
          <p>
            <strong>TokenIQ estimates AI costs</strong> based on your PR metadata (lines changed,
            files modified). By connecting your AI platform accounts, you can:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong>Compare estimated vs actual costs:</strong> See how accurate our algorithm is
            </li>
            <li>
              <strong>Track real API usage:</strong> Understand which PRs actually used which models
            </li>
            <li>
              <strong>Identify optimization opportunities:</strong> Find patterns in your team's
              AI usage
            </li>
            <li>
              <strong>Secure storage:</strong> API keys are encrypted with AES-256-GCM and never
              shared
            </li>
          </ul>
          <p className="pt-2">
            Currently, syncing with GitHub fetches PR metadata and generates estimated costs. When
            you add an OpenAI integration, the next sync will also fetch actual usage data from
            OpenAI's API and display both side-by-side.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
