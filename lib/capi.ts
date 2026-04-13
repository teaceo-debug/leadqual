import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// ═══════════════════════════════════════════════════════
// FACEBOOK CONVERSIONS API — SHARED MODULE
// ═══════════════════════════════════════════════════════
// All CAPI events go through here. Tiered events:
//   Lead (form submit) → QualifiedLead (AI scores 50+) → ClosedWon (converted)
// Each sends full 10+ match keys, external_id, and monetary value.

const FB_API_VERSION = 'v21.0'

// Map lead score tiers to monetary proxies
// Facebook uses 'value' to optimize delivery — higher value = find more of these
export function scoreToValue(score: number): number {
  if (score >= 75) return 5000  // Hot — high-value prospect
  if (score >= 50) return 1000  // Warm — solid prospect
  if (score >= 35) return 200   // Cool — worth nurturing
  return 0                       // Cold — don't waste signal
}

export function scoreTier(score: number): string {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'warm'
  if (score >= 35) return 'cool'
  return 'cold'
}

function hash(value: string): string {
  if (!value) return ''
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '1' + digits
  return digits
}

interface CAPIEventParams {
  eventName: string
  eventId: string
  eventSourceUrl?: string
  actionSource?: string
  // Lead data
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  // Tracking data (from form submission or lead record)
  fbclid?: string
  fbp?: string
  fbc?: string
  ip?: string
  userAgent?: string
  countryCode?: string
  zipCode?: string
  externalId?: string
  // Value
  score?: number
  customValue?: number
  // Facebook config
  pixelId: string
  accessToken: string
  testEventCode?: string
}

export async function fireCAPIEvent(params: CAPIEventParams): Promise<{ success: boolean; matchKeys: number; value: number }> {
  const {
    eventName, eventId, eventSourceUrl, actionSource = 'website',
    email, phone, firstName, lastName,
    fbclid, fbp, fbc: rawFbc, ip, userAgent, countryCode, zipCode, externalId,
    score = 0, customValue,
    pixelId, accessToken, testEventCode,
  } = params

  // Build fbc from fbclid if cookie wasn't captured
  let fbc = rawFbc || ''
  if (!fbc && fbclid) {
    fbc = `fb.1.${Date.now()}.${fbclid}`
  }

  // Calculate value: custom override, or score-based monetary proxy
  const value = customValue ?? scoreToValue(score)

  // Don't fire for cold leads (value = 0) unless it's a raw Lead event
  if (value === 0 && eventName !== 'Lead') {
    return { success: false, matchKeys: 0, value: 0 }
  }

  // Build user_data with ALL match keys for max EMQ
  const userData: Record<string, unknown> = {}

  // HIGH PRIORITY
  if (email) userData.em = [hash(email)]
  if (phone) {
    const norm = normalizePhone(phone)
    if (norm) userData.ph = [hash(norm)]
  }
  if (firstName) userData.fn = [hash(firstName)]
  if (lastName) userData.ln = [hash(lastName)]

  // MEDIUM PRIORITY
  if (zipCode) userData.zp = [hash(zipCode)]
  if (countryCode) userData.country = [hash(countryCode.toLowerCase())]

  // BROWSER/DEVICE
  if (ip) userData.client_ip_address = ip
  if (userAgent) userData.client_user_agent = userAgent

  // META COOKIES (highest match rate)
  if (fbp) userData.fbp = fbp
  if (fbc) userData.fbc = fbc

  // EXTERNAL ID (persistent cross-session identifier)
  if (externalId) userData.external_id = [hash(externalId)]

  const matchKeys = Object.keys(userData).length
  const tier = scoreTier(score)

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl || undefined,
      action_source: actionSource,
      user_data: userData,
      custom_data: {
        content_name: eventName,
        content_category: tier,
        currency: 'USD',
        value,
        lead_score: score,
        lead_tier: tier,
        match_keys_count: matchKeys,
      },
    }],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${FB_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const result = await res.json()
    console.log(`CAPI ${eventName} fired | score=${score} value=${value} keys=${matchKeys} | response:`, result)
    return { success: true, matchKeys, value }
  } catch (err) {
    console.error(`CAPI ${eventName} error:`, err)
    return { success: false, matchKeys, value }
  }
}

// Get Facebook settings for an organization (from any form with FB configured)
export async function getOrgFacebookSettings(organizationId: string) {
  const admin = createAdminClient()
  const { data: forms } = await admin
    .from('forms')
    .select('facebook')
    .eq('organization_id', organizationId)
    .not('facebook', 'eq', '{}')

  if (!forms || forms.length === 0) return null

  const fb = forms[0].facebook as { pixel_id?: string; access_token?: string; test_event_code?: string }
  if (!fb?.pixel_id || !fb?.access_token) return null

  return fb
}

// Helper to extract tracking data from a lead record for CAPI events
export function leadToTrackingParams(lead: Record<string, unknown>) {
  return {
    email: (lead.email as string) || '',
    phone: (lead.phone as string) || '',
    firstName: (lead.first_name as string) || '',
    lastName: (lead.last_name as string) || '',
    ip: (lead.source_ip as string) || '',
    userAgent: (lead.user_agent as string) || '',
    fbclid: (lead.fbclid as string) || '',
    fbp: (lead.fbp as string) || '',
    fbc: (lead.fbc as string) || '',
    externalId: (lead.id as string) || '',
  }
}
