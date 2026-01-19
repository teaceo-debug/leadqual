'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { WEBHOOK_EVENTS } from '@/lib/constants'
import type { Webhook, WebhookEvent } from '@/types'

interface WebhookFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  webhook?: Webhook | null
  onSave: (data: { url: string; events: WebhookEvent[] }) => void
  saving: boolean
}

const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  'lead.created': {
    label: 'Lead Created',
    description: 'When a new lead is submitted',
  },
  'lead.qualified': {
    label: 'Lead Qualified',
    description: 'When a lead is qualified by AI',
  },
  'lead.updated': {
    label: 'Lead Updated',
    description: 'When lead data is modified',
  },
  'lead.status_changed': {
    label: 'Status Changed',
    description: 'When lead status is updated',
  },
}

export function WebhookForm({
  open,
  onOpenChange,
  webhook,
  onSave,
  saving,
}: WebhookFormProps) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>([])

  const isEditing = !!webhook

  useEffect(() => {
    if (webhook) {
      setUrl(webhook.url)
      setEvents(webhook.events)
    } else {
      setUrl('')
      setEvents([])
    }
  }, [webhook, open])

  const handleEventToggle = (event: WebhookEvent) => {
    if (events.includes(event)) {
      setEvents(events.filter((e) => e !== event))
    } else {
      setEvents([...events, event])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ url, events })
  }

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const isValid = isValidUrl(url) && events.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Webhook' : 'Add Webhook'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url">Endpoint URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/leadqual"
            />
            <p className="text-xs text-muted-foreground">
              Must be a valid HTTPS URL that accepts POST requests
            </p>
          </div>

          <div className="space-y-3">
            <Label>Events to Send</Label>
            <div className="space-y-3">
              {WEBHOOK_EVENTS.map((event) => {
                const eventInfo = EVENT_LABELS[event]
                return (
                  <div key={event} className="flex items-start space-x-3">
                    <Checkbox
                      id={event}
                      checked={events.includes(event)}
                      onCheckedChange={() => handleEventToggle(event)}
                    />
                    <div className="grid gap-0.5">
                      <label
                        htmlFor={event}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {eventInfo?.label || event}
                      </label>
                      {eventInfo?.description && (
                        <p className="text-xs text-muted-foreground">
                          {eventInfo.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
