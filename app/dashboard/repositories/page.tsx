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
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'

interface Repo {
  id: string
  owner: string
  name: string
  lastSyncedAt: string | null
  prCount: number
  isDemo: boolean
}

interface ModelConfig { id: string; provider: string; model: string; isDefault: boolean }

export default function RepositoriesPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [modelConfigId, setModelConfigId] = useState('')
  const [models, setModels] = useState<ModelConfig[]>([])
  const [repositories, setRepositories] = useState<Repo[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    loadRepos()
  }, [])

  async function loadRepos() {
    try {
      const res = await fetch('/api/repositories')
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) {
        setRepositories([])
        setLoadError(data.error || 'Unable to load repositories. Please sign in again.')
        return
      }
      setRepositories(data)
      setLoadError(null)
    } catch (err) {
      console.error('Failed to load repos:', err)
      setLoadError('Unable to load repositories. Please try again.')
    }
  }

  useEffect(() => {
    fetch('/api/model-configs')
      .then(async res => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!ok || !Array.isArray(data)) {
          setModels([])
          return
        }
        setModels(data)
        setModelConfigId(data.find((item: ModelConfig) => item.isDefault)?.id ?? data[0]?.id ?? '')
      })
      .catch(() => setModels([]))
  }, [])

  const handleConnect = async () => {
    if (!repoUrl || !pat) {
      alert('Please fill in repo URL and PAT')
      return
    }

    // Parse GitHub URL: https://github.com/owner/repo
    let owner = '', name = ''
    try {
      const url = new URL(repoUrl)
      const parts = url.pathname.split('/').filter(p => p)
      if (parts.length >= 2) {
        owner = parts[0]
        name = parts[1].replace('.git', '')
      } else {
        alert('Invalid GitHub URL format. Use: https://github.com/owner/repo')
        return
      }
    } catch {
      alert('Invalid URL. Please enter a valid GitHub URL')
      return
    }

    setConnecting(true)
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          name,
          pat,
          modelConfigId,
          orgId: 'demo-org',
        }),
      })

      if (res.ok) {
        const newRepo = await res.json()
        setRepositories([...repositories, newRepo])
        setRepoUrl('')
        setPat('')
        setIsOpen(false)
        alert('Repository connected!')
      } else {
        const error = await res.json()
        alert(`Failed: ${error.error}`)
      }
    } catch (err) {
      console.error('Connect error:', err)
      alert('Error connecting repository')
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (repoId: string) => {
    setSyncing(repoId)
    try {
      const res = await fetch('/api/repositories/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId }),
      })

      if (res.ok) {
        const result = await res.json()
        alert(`Sync complete!\n✓ ${result.createdCount} new PRs\n✓ ${result.updatedCount} updated PRs`)
        await loadRepos()
      } else {
        const error = await res.json()
        alert(`Sync failed: ${error.error}`)
      }
    } catch (err) {
      console.error('Sync error:', err)
      alert('Error syncing repository')
    } finally {
      setSyncing(null)
    }
  }

  const handleRemove = async (repo: Repo) => {
    const confirmed = window.confirm(
      `Remove ${repo.owner}/${repo.name}? This also removes its ${repo.prCount} analyzed PRs and usage records.`,
    )
    if (!confirmed) return

    setRemoving(repo.id)
    try {
      const res = await fetch('/api/repositories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: repo.id }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(`Failed: ${error.error}`)
        return
      }

      setRepositories(current => current.filter(item => item.id !== repo.id))
    } catch (err) {
      console.error('Remove error:', err)
      alert('Error removing repository')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repositories</h1>
          <p className="text-slate-600 mt-1">
            Connect GitHub repositories to analyze AI usage
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Connect Repository
          </button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect GitHub Repository</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Repository URL</label>
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Model for estimates</label>
                <select value={modelConfigId} onChange={(e) => setModelConfigId(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" disabled={models.length === 0}>
                  {models.map(model => <option key={model.id} value={model.id}>{model.provider} · {model.model}{model.isDefault ? ' (default)' : ''}</option>)}
                </select>
                {models.length === 0 && <p className="text-xs text-amber-700">No models are configured yet.</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub PAT</label>
                <Input
                  type="password"
                  placeholder="ghp_..."
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                />
                <p className="text-xs text-slate-600">
                  Personal Access Token with repo read access
                </p>
              </div>

              <Button onClick={handleConnect} className="w-full" disabled={connecting}>
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Repositories */}
      <div className="space-y-4">
        {loadError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{loadError}</div>}
        {!loadError && repositories.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600">No repositories connected yet. Connect one above to begin analyzing pull requests.</div>}
        {repositories.map((repo) => (
          <Card key={repo.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>
                    {repo.owner}/{repo.name}
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {repo.prCount} PRs analyzed
                  </p>
                </div>
                <Badge>{repo.isDemo ? 'Demo data' : 'Active'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    {repo.isDemo
                      ? 'Generated demo data — it is not connected to GitHub.'
                      : <>Last synced: {repo.lastSyncedAt
                        ? new Date(repo.lastSyncedAt).toLocaleDateString()
                        : 'Never'}{' '}
                        {repo.lastSyncedAt && 'at'}{' '}
                        {repo.lastSyncedAt && new Date(repo.lastSyncedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</>}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!repo.isDemo && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleSync(repo.id)}
                      disabled={syncing === repo.id}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === repo.id ? 'animate-spin' : ''}`} />
                      {syncing === repo.id ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleRemove(repo)}
                    disabled={removing === repo.id}
                  >
                    <Trash2 className="w-4 h-4" />
                    {removing === repo.id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">How to connect a repository</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Create a GitHub Personal Access Token:{' '}
              <a
                href="https://github.com/settings/tokens/new"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/settings/tokens/new
              </a>
            </li>
            <li>Grant the token read access to repositories</li>
            <li>Enter your repository owner, name, and token above</li>
            <li>Click &ldquo;Sync Now&rdquo; to fetch pull request data</li>
            <li>
              TokenIQ will generate AI cost estimates based on PR metadata
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
