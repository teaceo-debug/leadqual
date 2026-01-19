/**
 * Unified Platform Conversion Service
 * Orchestrates sending events to all configured ad platforms
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { MetaConversionsAPI, createMetaClient } from './meta'
import { GoogleAdsConversions, GA4MeasurementProtocol, createGoogleAdsClient, createGA4Client } from './google'
import { TikTokEventsAPI, createTikTokClient } from './tiktok'

export interface Lead {
  id: string
  organization_id: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  company_name?: string
  score?: number
  label?: string
}

export interface TrackingData {
  fbclid?: string
  gclid?: string
  ttclid?: string
  fbp?: string
  fbc?: string
  ttp?: string
  ga_client_id?: string
  ip_address?: string
  user_agent?: string
  landing_page?: string
  referrer?: string
}

export interface ConversionEventResult {
  platform: string
  success: boolean
  eventId?: string
  error?: string
  response?: any
}

export class PlatformConversionService {
  private supabase: any
  private organizationId: string
  private metaClient: MetaConversionsAPI | null = null
  private googleClient: GoogleAdsConversions | null = null
  private ga4Client: GA4MeasurementProtocol | null = null
  private tiktokClient: TikTokEventsAPI | null = null
  private initialized = false

  constructor(organizationId: string) {
    this.organizationId = organizationId
    this.supabase = createAdminClient()
  }

  /**
   * Initialize all platform clients
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    const [meta, google, ga4, tiktok] = await Promise.all([
      createMetaClient(this.organizationId, this.supabase),
      createGoogleAdsClient(this.organizationId, this.supabase),
      createGA4Client(this.organizationId, this.supabase),
      createTikTokClient(this.organizationId, this.supabase)
    ])

    this.metaClient = meta
    this.googleClient = google
    this.ga4Client = ga4
    this.tiktokClient = tiktok
    this.initialized = true
  }

  /**
   * Send Lead event to all configured platforms
   */
  async sendLeadEvent(lead: Lead, tracking: TrackingData, value?: number): Promise<ConversionEventResult[]> {
    await this.initialize()
    const results: ConversionEventResult[] = []

    // Send to Meta
    if (this.metaClient && (tracking.fbclid || tracking.fbp || tracking.fbc || lead.email)) {
      try {
        const result = await this.metaClient.sendLeadEvent({
          email: lead.email,
          phone: lead.phone,
          firstName: lead.first_name,
          lastName: lead.last_name,
          ipAddress: tracking.ip_address,
          userAgent: tracking.user_agent,
          fbclid: tracking.fbclid,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
          eventSourceUrl: tracking.landing_page,
          leadValue: value,
          leadId: lead.id
        })
        results.push({ platform: 'meta', ...result })
        await this.logConversionEvent('meta', 'Lead', lead.id, tracking.fbclid, result)
      } catch (error) {
        results.push({ platform: 'meta', success: false, error: String(error) })
      }
    }

    // Send to Google Ads
    if (this.googleClient && (tracking.gclid || lead.email)) {
      try {
        const result = await this.googleClient.uploadConversion({
          gclid: tracking.gclid,
          email: lead.email,
          phone: lead.phone,
          conversionValue: value,
          leadId: lead.id
        })
        results.push({ platform: 'google', success: result.success, error: result.error, response: result.response })
        await this.logConversionEvent('google', 'Lead', lead.id, tracking.gclid, result)
      } catch (error) {
        results.push({ platform: 'google', success: false, error: String(error) })
      }
    }

    // Send to GA4
    if (this.ga4Client && tracking.ga_client_id) {
      try {
        const result = await this.ga4Client.sendLeadEvent({
          clientId: tracking.ga_client_id,
          leadValue: value,
          leadSource: tracking.fbclid ? 'facebook' : tracking.gclid ? 'google' : tracking.ttclid ? 'tiktok' : 'direct',
          leadId: lead.id
        })
        results.push({ platform: 'ga4', success: result.success, error: result.error })
      } catch (error) {
        results.push({ platform: 'ga4', success: false, error: String(error) })
      }
    }

    // Send to TikTok
    if (this.tiktokClient && (tracking.ttclid || tracking.ttp || lead.email)) {
      try {
        const result = await this.tiktokClient.sendLeadEvent({
          email: lead.email,
          phone: lead.phone,
          ipAddress: tracking.ip_address,
          userAgent: tracking.user_agent,
          ttclid: tracking.ttclid,
          ttp: tracking.ttp,
          pageUrl: tracking.landing_page,
          referrer: tracking.referrer,
          leadValue: value,
          leadId: lead.id
        })
        results.push({ platform: 'tiktok', ...result })
        await this.logConversionEvent('tiktok', 'Lead', lead.id, tracking.ttclid, result)
      } catch (error) {
        results.push({ platform: 'tiktok', success: false, error: String(error) })
      }
    }

    return results
  }

  /**
   * Send Qualified Lead event to all configured platforms
   */
  async sendQualifiedLeadEvent(lead: Lead, tracking: TrackingData): Promise<ConversionEventResult[]> {
    await this.initialize()
    const results: ConversionEventResult[] = []

    // Send to Meta
    if (this.metaClient && (tracking.fbclid || tracking.fbp || tracking.fbc || lead.email)) {
      try {
        const result = await this.metaClient.sendQualifiedLeadEvent({
          email: lead.email,
          phone: lead.phone,
          firstName: lead.first_name,
          lastName: lead.last_name,
          ipAddress: tracking.ip_address,
          userAgent: tracking.user_agent,
          fbclid: tracking.fbclid,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
          eventSourceUrl: tracking.landing_page,
          qualificationScore: lead.score,
          qualificationLabel: lead.label,
          leadId: lead.id
        })
        results.push({ platform: 'meta', ...result })
        await this.logConversionEvent('meta', 'QualifiedLead', lead.id, tracking.fbclid, result)
      } catch (error) {
        results.push({ platform: 'meta', success: false, error: String(error) })
      }
    }

    // Send to TikTok
    if (this.tiktokClient && (tracking.ttclid || tracking.ttp || lead.email)) {
      try {
        const result = await this.tiktokClient.sendQualifiedLeadEvent({
          email: lead.email,
          phone: lead.phone,
          ipAddress: tracking.ip_address,
          userAgent: tracking.user_agent,
          ttclid: tracking.ttclid,
          ttp: tracking.ttp,
          pageUrl: tracking.landing_page,
          referrer: tracking.referrer,
          qualificationScore: lead.score,
          qualificationLabel: lead.label,
          leadId: lead.id
        })
        results.push({ platform: 'tiktok', ...result })
        await this.logConversionEvent('tiktok', 'QualifiedLead', lead.id, tracking.ttclid, result)
      } catch (error) {
        results.push({ platform: 'tiktok', success: false, error: String(error) })
      }
    }

    return results
  }

  /**
   * Send Conversion/Purchase event to all configured platforms
   */
  async sendConversionEvent(lead: Lead, tracking: TrackingData, value: number, orderId?: string): Promise<ConversionEventResult[]> {
    await this.initialize()
    const results: ConversionEventResult[] = []

    // Send to Meta
    if (this.metaClient && (tracking.fbclid || tracking.fbp || tracking.fbc || lead.email)) {
      try {
        const result = await this.metaClient.sendConversionEvent({
          email: lead.email,
          phone: lead.phone,
          firstName: lead.first_name,
          lastName: lead.last_name,
          ipAddress: tracking.ip_address,
          userAgent: tracking.user_agent,
          fbclid: tracking.fbclid,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
          eventSourceUrl: tracking.landing_page,
          value,
          orderId,
          leadId: lead.id
        })
        results.push({ platform: 'meta', ...result })
        await this.logConversionEvent('meta', 'Purchase', lead.id, tracking.fbclid, result)
      } catch (error) {
        results.push({ platform: 'meta', success: false, error: String(error) })
      }
    }

    // Send to Google Ads
    if (this.googleClient && (tracking.gclid || lead.email)) {
      try {
        const result = await this.googleClient.uploadConversion({
          gclid: tracking.gclid,
          email: lead.email,
          phone: lead.phone,
          conversionValue: value,
          orderId,
          leadId: lead.id
        })
        results.push({ platform: 'google', success: result.success, error: result.error, response: result.response })
        await this.logConversionEvent('google', 'Purchase', lead.id, tracking.gclid, result)
      } catch (error) {
        results.push({ platform: 'google', success: false, error: String(error) })
      }
    }

    // Send to GA4
    if (this.ga4Client && tracking.ga_client_id) {
      try {
        const result = await this.ga4Client.sendConversionEvent({
          clientId: tracking.ga_client_id,
          transactionId: orderId || `lead_${lead.id}`,
          value,
          leadId: lead.id
        })
        results.push({ platform: 'ga4', success: result.success, error: result.error })
      } catch (error) {
        results.push({ platform: 'ga4', success: false, error: String(error) })
      }
    }

    // Send to TikTok
    if (this.tiktokClient && (tracking.ttclid || tracking.ttp || lead.email)) {
      try {
        const result = await this.tiktokClient.sendConversionEvent({
          email: lead.email,
          phone: lead.phone,
          ipAddress: tracking.ip_address,
          userAgent: tracking.user_agent,
          ttclid: tracking.ttclid,
          ttp: tracking.ttp,
          pageUrl: tracking.landing_page,
          referrer: tracking.referrer,
          value,
          orderId,
          leadId: lead.id
        })
        results.push({ platform: 'tiktok', ...result })
        await this.logConversionEvent('tiktok', 'Purchase', lead.id, tracking.ttclid, result)
      } catch (error) {
        results.push({ platform: 'tiktok', success: false, error: String(error) })
      }
    }

    return results
  }

  /**
   * Log conversion event to database
   */
  private async logConversionEvent(
    platform: string,
    eventName: string,
    leadId: string,
    clickId: string | undefined,
    result: { success: boolean; eventId?: string; error?: string; response?: any }
  ): Promise<void> {
    try {
      await this.supabase
        .from('conversion_events')
        .insert({
          lead_id: leadId,
          organization_id: this.organizationId,
          platform,
          event_name: eventName,
          click_id: clickId,
          event_id: result.eventId,
          status: result.success ? 'success' : 'failed',
          error_message: result.error,
          api_response: result.response,
          sent_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log conversion event:', error)
    }
  }
}

/**
 * Get tracking data for a lead
 */
export async function getLeadTrackingData(leadId: string, organizationId: string): Promise<TrackingData | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('lead_tracking')
    .select('*')
    .eq('lead_id', leadId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    fbclid: data.fbclid,
    gclid: data.gclid,
    ttclid: data.ttclid,
    fbp: data.fbp,
    fbc: data.fbc,
    ttp: data.ttp,
    ga_client_id: data.ga_client_id,
    ip_address: data.ip_address,
    user_agent: data.user_agent,
    landing_page: data.landing_page,
    referrer: data.referrer
  }
}

export { MetaConversionsAPI, GoogleAdsConversions, GA4MeasurementProtocol, TikTokEventsAPI }
