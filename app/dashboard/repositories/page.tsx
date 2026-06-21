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
import { Plus, RefreshCw } from 'lucide-react'

interface Repo {
  id: string
  owner: string
  name: string
  lastSyncedAt: string | null
  prCount: number
}

export default function RepositoriesPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [repositories, setRepositories] = useState<Repo[]>([])
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    loadRepos()
  }, [])

  const loadRepos = async () => {
    try {
      const res = await fetch('/api/repositories')
      const data = await res.json()
      setRepositories(data)
    } catch (err) {
      console.error('Failed to load repos:', err)
    }
  }

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
          <DialogTrigger>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Connect Repository
            </Button>
          </DialogTrigger>
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
                <Badge>Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Last synced:{' '}
                  {repo.lastSyncedAt
                    ? new Date(repo.lastSyncedAt).toLocaleDateString()
                    : 'Never'}{' '}
                  {repo.lastSyncedAt && 'at'}{' '}
                  {repo.lastSyncedAt && new Date(repo.lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e: any) => {
                    e.preventDefault()
                    handleSync(repo.id)
                  }}
                  disabled={syncing === repo.id}
                >
                  <RefreshCw className={`w-4 h-4 ${syncing === repo.id ? 'animate-spin' : ''}`} />
                  {syncing === repo.id ? 'Syncing...' : 'Sync Now'}
                </Button>
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
            <li>Click "Sync Now" to fetch pull request data</li>
            <li>
              TokenIQ will generate AI cost estimates based on PR metadata
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
