'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Copy,
  Check,
  Plus,
  Key,
  Trash2,
  Clock,
  Activity,
  ArrowLeft,
} from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import type { APIKey, APIKeyScope } from '@/types'
import Link from 'next/link'

const SCOPE_OPTIONS: { scope: APIKeyScope; label: string; description: string }[] = [
  { scope: 'leads:read', label: 'Read Leads', description: 'View leads and search' },
  { scope: 'leads:write', label: 'Write Leads', description: 'Create, update, archive leads' },
  { scope: 'icp:read', label: 'Read ICP', description: 'View ICP criteria' },
  { scope: 'analytics:read', label: 'Read Analytics', description: 'View analytics data' },
]

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<APIKeyScope[]>(['leads:read'])

  // New key display
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Revoke state
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys')
      const data = await response.json()

      if (response.ok) {
        setApiKeys(data.data)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to fetch API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || selectedScopes.length === 0) return

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: selectedScopes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewKey(data.data.key)
        setApiKeys([data.data, ...apiKeys])
        setNewKeyName('')
        setSelectedScopes(['leads:read'])
      } else {
        setError(data.error || 'Failed to create API key')
        setCreateOpen(false)
      }
    } catch {
      setError('Failed to create API key')
      setCreateOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    setRevoking(keyId)
    setError(null)

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setApiKeys(apiKeys.map(k =>
          k.id === keyId
            ? { ...k, revoked_at: new Date().toISOString(), is_active: false }
            : k
        ))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to revoke API key')
      }
    } catch {
      setError('Failed to revoke API key')
    } finally {
      setRevoking(null)
    }
  }

  const handleCopyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const handleCloseNewKey = () => {
    setNewKey(null)
    setCreateOpen(false)
  }

  const toggleScope = (scope: APIKeyScope) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope))
    } else {
      setSelectedScopes([...selectedScopes, scope])
    }
  }

  const activeKeys = apiKeys.filter(k => !k.revoked_at)
  const revokedKeys = apiKeys.filter(k => k.revoked_at)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to your data
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Key Display Dialog */}
      <Dialog open={!!newKey} onOpenChange={() => handleCloseNewKey()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Make sure to copy your API key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newKey || ''}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyKey}
              >
                {copiedKey ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="rounded-md bg-warning/10 border border-warning/20 p-3">
              <p className="text-sm text-warning">
                This key will only be shown once. Store it securely.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseNewKey}>
              I&apos;ve copied the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Key Dialog */}
      <Dialog open={createOpen && !newKey} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button className="ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access to your data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API Key"
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this key
              </p>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-3">
                {SCOPE_OPTIONS.map(({ scope, label, description }) => (
                  <div key={scope} className="flex items-center space-x-3">
                    <Checkbox
                      id={scope}
                      checked={selectedScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={scope}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
            >
              {creating ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active API Keys
          </CardTitle>
          <CardDescription>
            {activeKeys.length} active {activeKeys.length === 1 ? 'key' : 'keys'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active API keys</p>
              <p className="text-sm">Create your first API key to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{key.name}</h4>
                      {key.is_active ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                      {key.key_prefix}{'•'.repeat(20)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {formatRelativeDate(key.created_at)}
                      </span>
                      {key.last_used_at && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Last used {formatRelativeDate(key.last_used_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRevokeKey(key.id)}
                    disabled={revoking === key.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Revoked Keys</CardTitle>
            <CardDescription>
              {revokedKeys.length} revoked {revokedKeys.length === 1 ? 'key' : 'keys'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50 opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{key.name}</h4>
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        Revoked
                      </Badge>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground mt-1">
                      {key.key_prefix}{'•'.repeat(20)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Revoked {key.revoked_at && formatRelativeDate(key.revoked_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            How to use your API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication</Label>
            <p className="text-sm text-muted-foreground">
              Include your API key in the Authorization header:
            </p>
            <code className="block rounded bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">
              Authorization: Bearer sk_live_your_api_key
            </code>
          </div>

          <div className="space-y-2">
            <Label>Example Request</Label>
            <code className="block rounded bg-muted px-3 py-2 text-xs font-mono overflow-x-auto whitespace-pre">
{`curl -H "Authorization: Bearer sk_live_your_api_key" \\
     ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadqual.io'}/api/v1/leads`}
            </code>
          </div>

          <div className="space-y-2">
            <Label>Available Endpoints</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><code className="text-xs bg-muted px-1 rounded">GET /api/v1/leads</code> - List leads</p>
              <p><code className="text-xs bg-muted px-1 rounded">POST /api/v1/leads</code> - Create lead</p>
              <p><code className="text-xs bg-muted px-1 rounded">GET /api/v1/leads/:id</code> - Get lead</p>
              <p><code className="text-xs bg-muted px-1 rounded">PATCH /api/v1/leads/:id</code> - Update lead</p>
              <p><code className="text-xs bg-muted px-1 rounded">DELETE /api/v1/leads/:id</code> - Archive lead</p>
              <p><code className="text-xs bg-muted px-1 rounded">POST /api/v1/leads/:id/qualify</code> - Re-qualify lead</p>
              <p><code className="text-xs bg-muted px-1 rounded">GET /api/v1/icp</code> - Get ICP criteria</p>
              <p><code className="text-xs bg-muted px-1 rounded">GET /api/v1/analytics</code> - Get analytics</p>
              <p><code className="text-xs bg-muted px-1 rounded">GET /api/v1/usage</code> - Get API usage stats</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
