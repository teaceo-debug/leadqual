'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { WebhookCard } from '@/components/webhooks/webhook-card'
import { WebhookForm } from '@/components/webhooks/webhook-form'
import { Plus, Webhook, AlertCircle, Copy, Check } from 'lucide-react'
import type { Webhook as WebhookType, WebhookEvent } from '@/types'

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [saving, setSaving] = useState(false)
  const [copiedExample, setCopiedExample] = useState(false)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks')
      const data = await response.json()

      if (response.ok) {
        setWebhooks(data.webhooks)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: { url: string; events: WebhookEvent[] }) => {
    setSaving(true)
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setWebhooks([result.webhook, ...webhooks])
        setFormOpen(false)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to create webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: { url: string; events: WebhookEvent[] }) => {
    if (!editingWebhook) return

    setSaving(true)
    try {
      const response = await fetch(`/api/webhooks/${editingWebhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setWebhooks(webhooks.map((w) => (w.id === editingWebhook.id ? result.webhook : w)))
        setEditingWebhook(null)
        setFormOpen(false)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to update webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWebhooks(webhooks.filter((w) => w.id !== id))
      } else {
        const result = await response.json()
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to delete webhook')
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })

      const result = await response.json()

      if (response.ok) {
        setWebhooks(webhooks.map((w) => (w.id === id ? result.webhook : w)))
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to update webhook')
    }
  }

  const handleRegenerateSecret = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_secret: true }),
      })

      const result = await response.json()

      if (response.ok) {
        setWebhooks(webhooks.map((w) => (w.id === id ? result.webhook : w)))
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to regenerate secret')
    }
  }

  const handleEdit = (webhook: WebhookType) => {
    setEditingWebhook(webhook)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingWebhook(null)
    }
  }

  const handleCopyExample = async () => {
    const example = `// Verify webhook signature
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === expected;
}

// Handle webhook
app.post('/webhooks/leadqual', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;

  switch (event) {
    case 'lead.qualified':
      console.log('New qualified lead:', data);
      break;
  }

  res.status(200).send('OK');
});`

    await navigator.clipboard.writeText(example)
    setCopiedExample(true)
    setTimeout(() => setCopiedExample(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48 mt-1" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Send lead events to external services in real-time
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
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

      {/* Documentation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Integration Guide</CardTitle>
          <CardDescription>
            Webhooks are sent as POST requests with a JSON payload and signature header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              All payloads include an <code className="bg-muted px-1 rounded">x-webhook-signature</code> header for verification.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyExample}
            >
              {copiedExample ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Example
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks list */}
      {webhooks.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Webhook className="h-12 w-12" />}
            title="No webhooks configured"
            description="Add a webhook endpoint to receive real-time notifications when lead events occur."
            action={
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Webhook
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onRegenerateSecret={handleRegenerateSecret}
            />
          ))}
        </div>
      )}

      <WebhookForm
        open={formOpen}
        onOpenChange={handleFormClose}
        webhook={editingWebhook}
        onSave={editingWebhook ? handleUpdate : handleCreate}
        saving={saving}
      />
    </div>
  )
}
