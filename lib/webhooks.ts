import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Lead } from '@/types'

export type WebhookEvent = 'lead.created' | 'lead.qualified' | 'lead.updated'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: {
    lead: Partial<Lead>
  }
}

interface Webhook {
  id: string
  organization_id: string
  url: string
  secret: string
  events: WebhookEvent[]
  active: boolean
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Send webhook to a single endpoint
 */
async function sendWebhook(
  webhook: Webhook,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payloadString = JSON.stringify(payload)
  const signature = generateSignature(payloadString, webhook.secret)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
      },
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    return {
      success: response.ok,
      statusCode: response.status,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(
  webhookId: string,
  event: WebhookEvent,
  leadId: string,
  success: boolean,
  statusCode?: number,
  error?: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhookId,
    event,
    lead_id: leadId,
    success,
    status_code: statusCode,
    error_message: error,
    delivered_at: new Date().toISOString(),
  })
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  organizationId: string,
  event: WebhookEvent,
  lead: Partial<Lead>
): Promise<void> {
  const supabase = createAdminClient()

  // Get all active webhooks for this organization that subscribe to this event
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .contains('events', [event])

  if (error || !webhooks || webhooks.length === 0) {
    return
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: {
      lead: sanitizeLeadForWebhook(lead),
    },
  }

  // Send webhooks in parallel (fire and forget for now, could add queue later)
  const deliveryPromises = webhooks.map(async (webhook: Webhook) => {
    const result = await sendWebhook(webhook, payload)

    // Log the delivery attempt
    await logWebhookDelivery(
      webhook.id,
      event,
      lead.id || '',
      result.success,
      result.statusCode,
      result.error
    )

    // If failed, could implement retry logic here
    if (!result.success) {
      console.warn(
        `Webhook delivery failed for ${webhook.url}: ${result.error || `Status ${result.statusCode}`}`
      )
    }
  })

  // Wait for all webhooks to be sent (non-blocking to the main flow)
  Promise.all(deliveryPromises).catch(console.error)
}

/**
 * Sanitize lead data for webhook payload (remove sensitive fields)
 */
function sanitizeLeadForWebhook(lead: Partial<Lead>): Partial<Lead> {
  // Remove internal fields that shouldn't be sent to external systems
  const { source_ip, user_agent, ...sanitized } = lead as Lead & { source_ip?: string; user_agent?: string }
  return sanitized
}

/**
 * Trigger lead.created webhook
 */
export async function triggerLeadCreatedWebhook(
  organizationId: string,
  lead: Partial<Lead>
): Promise<void> {
  await triggerWebhooks(organizationId, 'lead.created', lead)
}

/**
 * Trigger lead.qualified webhook
 */
export async function triggerLeadQualifiedWebhook(
  organizationId: string,
  lead: Partial<Lead>
): Promise<void> {
  await triggerWebhooks(organizationId, 'lead.qualified', lead)
}

/**
 * Trigger lead.updated webhook
 */
export async function triggerLeadUpdatedWebhook(
  organizationId: string,
  lead: Partial<Lead>
): Promise<void> {
  await triggerWebhooks(organizationId, 'lead.updated', lead)
}
