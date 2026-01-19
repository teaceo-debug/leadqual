/**
 * Meta (Facebook) Conversions API Integration
 * Sends server-side events for improved attribution and lead optimization
 */

import crypto from 'crypto'

interface MetaCredentials {
  pixel_id: string
  access_token: string
}

interface MetaEvent {
  event_name: string
  event_time: number
  event_id?: string
  event_source_url?: string
  action_source: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other'
  user_data: MetaUserData
  custom_data?: Record<string, any>
  opt_out?: boolean
}

interface MetaUserData {
  em?: string[]       // hashed emails
  ph?: string[]       // hashed phone numbers
  fn?: string[]       // hashed first names
  ln?: string[]       // hashed last names
  ct?: string[]       // hashed cities
  st?: string[]       // hashed states
  zp?: string[]       // hashed zip codes
  country?: string[]  // hashed country codes
  external_id?: string[]
  client_ip_address?: string
  client_user_agent?: string
  fbc?: string        // Facebook click ID cookie
  fbp?: string        // Facebook browser ID
  lead_id?: string    // Facebook lead form ID
}

// SHA-256 hash for PII
function hashData(data: string | undefined): string | undefined {
  if (!data) return undefined
  return crypto
    .createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex')
}

// Normalize and hash email
function hashEmail(email: string | undefined): string | undefined {
  if (!email) return undefined
  return hashData(email.toLowerCase().trim())
}

// Normalize and hash phone (remove non-digits)
function hashPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined
  const normalized = phone.replace(/\D/g, '')
  return hashData(normalized)
}

export class MetaConversionsAPI {
  private pixelId: string
  private accessToken: string
  private testEventCode?: string
  private apiVersion = 'v21.0'

  constructor(credentials: MetaCredentials, testEventCode?: string) {
    this.pixelId = credentials.pixel_id
    this.accessToken = credentials.access_token
    this.testEventCode = testEventCode
  }

  /**
   * Send a Lead event when a new lead is captured
   */
  async sendLeadEvent(params: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    ipAddress?: string
    userAgent?: string
    fbclid?: string
    fbp?: string
    fbc?: string
    eventSourceUrl?: string
    leadValue?: number
    currency?: string
    leadId?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event: MetaEvent = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: params.eventSourceUrl,
      action_source: 'website',
      user_data: {
        em: params.email ? [hashEmail(params.email)!] : undefined,
        ph: params.phone ? [hashPhone(params.phone)!] : undefined,
        fn: params.firstName ? [hashData(params.firstName)!] : undefined,
        ln: params.lastName ? [hashData(params.lastName)!] : undefined,
        ct: params.city ? [hashData(params.city)!] : undefined,
        st: params.state ? [hashData(params.state)!] : undefined,
        zp: params.zipCode ? [hashData(params.zipCode)!] : undefined,
        country: params.country ? [hashData(params.country)!] : undefined,
        client_ip_address: params.ipAddress,
        client_user_agent: params.userAgent,
        fbc: params.fbc || (params.fbclid ? `fb.1.${Date.now()}.${params.fbclid}` : undefined),
        fbp: params.fbp
      },
      custom_data: {
        value: params.leadValue,
        currency: params.currency || 'USD',
        lead_event_source: 'leadscores',
        internal_lead_id: params.leadId
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Send a Purchase/Conversion event when a lead converts
   */
  async sendConversionEvent(params: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    ipAddress?: string
    userAgent?: string
    fbclid?: string
    fbp?: string
    fbc?: string
    eventSourceUrl?: string
    value: number
    currency?: string
    leadId?: string
    orderId?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const event: MetaEvent = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: params.eventSourceUrl,
      action_source: 'website',
      user_data: {
        em: params.email ? [hashEmail(params.email)!] : undefined,
        ph: params.phone ? [hashPhone(params.phone)!] : undefined,
        fn: params.firstName ? [hashData(params.firstName)!] : undefined,
        ln: params.lastName ? [hashData(params.lastName)!] : undefined,
        client_ip_address: params.ipAddress,
        client_user_agent: params.userAgent,
        fbc: params.fbc || (params.fbclid ? `fb.1.${Date.now()}.${params.fbclid}` : undefined),
        fbp: params.fbp
      },
      custom_data: {
        value: params.value,
        currency: params.currency || 'USD',
        order_id: params.orderId,
        internal_lead_id: params.leadId
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Send a qualified lead event (for campaign optimization)
   */
  async sendQualifiedLeadEvent(params: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    ipAddress?: string
    userAgent?: string
    fbclid?: string
    fbp?: string
    fbc?: string
    eventSourceUrl?: string
    qualificationScore?: number
    qualificationLabel?: string
    leadId?: string
  }): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const eventId = `ql_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Use CompleteRegistration for qualified leads (Meta recognizes this as a valuable mid-funnel event)
    const event: MetaEvent = {
      event_name: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: params.eventSourceUrl,
      action_source: 'website',
      user_data: {
        em: params.email ? [hashEmail(params.email)!] : undefined,
        ph: params.phone ? [hashPhone(params.phone)!] : undefined,
        fn: params.firstName ? [hashData(params.firstName)!] : undefined,
        ln: params.lastName ? [hashData(params.lastName)!] : undefined,
        client_ip_address: params.ipAddress,
        client_user_agent: params.userAgent,
        fbc: params.fbc || (params.fbclid ? `fb.1.${Date.now()}.${params.fbclid}` : undefined),
        fbp: params.fbp
      },
      custom_data: {
        qualification_score: params.qualificationScore,
        qualification_label: params.qualificationLabel,
        internal_lead_id: params.leadId,
        event_category: 'qualified_lead'
      }
    }

    return this.sendEvent(event)
  }

  /**
   * Send raw event to Meta Conversions API
   */
  private async sendEvent(event: MetaEvent): Promise<{ success: boolean; eventId: string; response?: any; error?: string }> {
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events`

    // Clean up undefined values from user_data
    Object.keys(event.user_data).forEach(key => {
      if (event.user_data[key as keyof MetaUserData] === undefined) {
        delete event.user_data[key as keyof MetaUserData]
      }
    })

    const payload: any = {
      data: [event],
      access_token: this.accessToken
    }

    // Add test event code if in test mode
    if (this.testEventCode) {
      payload.test_event_code = this.testEventCode
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          eventId: event.event_id || '',
          error: data.error?.message || 'Meta API error',
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

export async function createMetaClient(organizationId: string, supabase: any): Promise<MetaConversionsAPI | null> {
  const { data: credentials } = await supabase
    .from('platform_credentials')
    .select('pixel_id, access_token, config')
    .eq('organization_id', organizationId)
    .eq('platform', 'meta')
    .eq('is_active', true)
    .single()

  if (!credentials?.pixel_id || !credentials?.access_token) {
    return null
  }

  return new MetaConversionsAPI(
    {
      pixel_id: credentials.pixel_id,
      access_token: credentials.access_token
    },
    credentials.config?.test_event_code
  )
}
