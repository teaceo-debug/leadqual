/**
 * TikTok Events API Integration
 * Sends server-side events for improved attribution and lead optimization
 */

import crypto from 'crypto'

interface TikTokCredentials {
  pixel_id: string
  access_token: string
}

interface TikTokEvent {
  event: string
  event_time: number
  event_id?: string
  user: TikTokUserData
  page?: {
    url?: string
    referrer?: string
  }
  properties?: Record<string, any>
  test_event_code?: string
}

interface TikTokUserData {
  email?: string        // hashed
  phone?: string        // hashed
  external_id?: string  // hashed
  ttp?: string          // TikTok browser ID
  ip?: string
  user_agent?: string
  ttclid?: string       // TikTok click ID
}

// SHA-256 hash for PII
function hashData(data: string | undefined): string | undefined {
  if (!data) return undefined
  return crypto
    .createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex')
}

// Normalize phone (E.164 format without + sign)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Ensure it starts with country code
  if (digits.length === 10) {
    return '1' + digits // Assume US
  }
  return digits
}

export class TikTokEventsAPI {
  private pixelId: string
  private accessToken: string
  private testEventCode?: string
  private apiVersion = 'v1.3'

  constructor(credentials: TikTokCredentials, testEventCode?: string) {
    this.pixelId = credentials.pixel_id
    this.accessToken = credentials.access_token
    this.testEventCode = testEventCode
  }

  /**
   * Send a Lead/SubmitForm event when a new lead is captured
   */
  async sendLeadEvent(params: {
    email?: string
    phone?: string
    externalId?: string
    ipAddress?: string
    userAgent?: string
    ttclid?: string
    ttp?: string
    pageUrl?: string
    referrer?: string
    leadValue?: number
    currency?: string
    leadId?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event: TikTokEvent = {
      event: 'SubmitForm', // TikTok's Lead event
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      user: this.buildUserData(params),
      page: {
        url: params.pageUrl,
        referrer: params.referrer
      },
      properties: {
        content_type: 'lead',
        value: params.leadValue,
        currency: params.currency || 'USD',
        lead_id: params.leadId
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Send a Complete Payment/Purchase event when a lead converts
   */
  async sendConversionEvent(params: {
    email?: string
    phone?: string
    externalId?: string
    ipAddress?: string
    userAgent?: string
    ttclid?: string
    ttp?: string
    pageUrl?: string
    referrer?: string
    value: number
    currency?: string
    orderId?: string
    leadId?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event: TikTokEvent = {
      event: 'CompletePayment', // TikTok's Purchase event
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      user: this.buildUserData(params),
      page: {
        url: params.pageUrl,
        referrer: params.referrer
      },
      properties: {
        content_type: 'product',
        value: params.value,
        currency: params.currency || 'USD',
        order_id: params.orderId,
        lead_id: params.leadId
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Send a Complete Registration event for qualified leads
   */
  async sendQualifiedLeadEvent(params: {
    email?: string
    phone?: string
    externalId?: string
    ipAddress?: string
    userAgent?: string
    ttclid?: string
    ttp?: string
    pageUrl?: string
    referrer?: string
    qualificationScore?: number
    qualificationLabel?: string
    leadId?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `ql_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event: TikTokEvent = {
      event: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      user: this.buildUserData(params),
      page: {
        url: params.pageUrl,
        referrer: params.referrer
      },
      properties: {
        content_type: 'qualified_lead',
        qualification_score: params.qualificationScore,
        qualification_label: params.qualificationLabel,
        lead_id: params.leadId
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Send a ViewContent event for page views
   */
  async sendViewContentEvent(params: {
    email?: string
    phone?: string
    ipAddress?: string
    userAgent?: string
    ttclid?: string
    ttp?: string
    pageUrl?: string
    referrer?: string
    contentType?: string
    contentId?: string
    contentName?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `vc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event: TikTokEvent = {
      event: 'ViewContent',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      user: this.buildUserData(params),
      page: {
        url: params.pageUrl,
        referrer: params.referrer
      },
      properties: {
        content_type: params.contentType,
        content_id: params.contentId,
        content_name: params.contentName
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Build user data object with hashed PII
   */
  private buildUserData(params: {
    email?: string
    phone?: string
    externalId?: string
    ipAddress?: string
    userAgent?: string
    ttclid?: string
    ttp?: string
  }): TikTokUserData {
    return {
      email: params.email ? hashData(params.email.toLowerCase().trim()) : undefined,
      phone: params.phone ? hashData(normalizePhone(params.phone)) : undefined,
      external_id: params.externalId ? hashData(params.externalId) : undefined,
      ip: params.ipAddress,
      user_agent: params.userAgent,
      ttclid: params.ttclid,
      ttp: params.ttp
    }
  }

  /**
   * Send event to TikTok Events API
   */
  private async sendEvent(event: TikTokEvent): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const endpoint = `https://business-api.tiktok.com/open_api/${this.apiVersion}/pixel/track/`

    // Add test event code if in test mode
    if (this.testEventCode) {
      event.test_event_code = this.testEventCode
    }

    // Clean up undefined values
    Object.keys(event.user).forEach(key => {
      if (event.user[key as keyof TikTokUserData] === undefined) {
        delete event.user[key as keyof TikTokUserData]
      }
    })

    if (event.page) {
      Object.keys(event.page).forEach(key => {
        if (event.page![key as keyof typeof event.page] === undefined) {
          delete event.page![key as keyof typeof event.page]
        }
      })
    }

    if (event.properties) {
      Object.keys(event.properties).forEach(key => {
        if (event.properties![key] === undefined) {
          delete event.properties![key]
        }
      })
    }

    const payload = {
      pixel_code: this.pixelId,
      event: event.event,
      event_id: event.event_id,
      timestamp: new Date(event.event_time * 1000).toISOString(),
      context: {
        user: event.user,
        page: event.page,
        user_agent: event.user.user_agent,
        ip: event.user.ip
      },
      properties: event.properties,
      test_event_code: event.test_event_code
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': this.accessToken
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.code !== 0) {
        return {
          success: false,
          eventId: event.event_id || '',
          error: data.message || 'TikTok API error',
          response: data
        }
      }

      return {
        success: true,
        eventId: event.event_id || '',
        response: data
      }
    } catch (error) {
      return {
        success: false,
        eventId: event.event_id || '',
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }
}

export async function createTikTokClient(organizationId: string, supabase: any): Promise<TikTokEventsAPI | null> {
  const { data: credentials } = await supabase
    .from('platform_credentials')
    .select('pixel_id, access_token, config')
    .eq('organization_id', organizationId)
    .eq('platform', 'tiktok')
    .eq('is_active', true)
    .single()

  if (!credentials?.pixel_id || !credentials?.access_token) {
    return null
  }

  return new TikTokEventsAPI(
    {
      pixel_id: credentials.pixel_id,
      access_token: credentials.access_token
    },
    credentials.config?.test_event_code
  )
}
