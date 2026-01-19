'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit2, Trash2, Key, Copy, Check, Globe } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import type { Webhook } from '@/types'

interface WebhookCardProps {
  webhook: Webhook
  onEdit: (webhook: Webhook) => void
  onDelete: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onRegenerateSecret: (id: string) => void
}

export function WebhookCard({
  webhook,
  onEdit,
  onDelete,
  onToggle,
  onRegenerateSecret,
}: WebhookCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(webhook.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const eventLabels: Record<string, string> = {
    'lead.created': 'New Lead',
    'lead.qualified': 'Qualified',
    'lead.updated': 'Updated',
    'lead.status_changed': 'Status Changed',
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">
                  {new URL(webhook.url).hostname}
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {webhook.url}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={webhook.is_active}
                onCheckedChange={(checked) => onToggle(webhook.id, checked)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(webhook)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRegenerateConfirm(true)}>
                    <Key className="mr-2 h-4 w-4" />
                    Regenerate Secret
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Events
            </p>
            <div className="flex flex-wrap gap-1">
              {webhook.events.map((event) => (
                <Badge key={event} variant="secondary" className="text-xs">
                  {eventLabels[event] || event}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Secret
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono">
                {webhook.secret.slice(0, 20)}...
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopySecret}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Created {formatRelativeDate(webhook.created_at)}</span>
            <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
              {webhook.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Webhook"
        description={`Are you sure you want to delete this webhook? Events will no longer be sent to ${new URL(webhook.url).hostname}.`}
        confirmText="delete"
        onConfirm={() => onDelete(webhook.id)}
        variant="destructive"
      />

      <ConfirmDialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
        title="Regenerate Secret"
        description="This will invalidate the current secret. You'll need to update your endpoint with the new secret."
        confirmText="regenerate"
        onConfirm={() => onRegenerateSecret(webhook.id)}
        variant="destructive"
      />
    </>
  )
}
