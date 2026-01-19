import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Track behavioral events from the client-side tracker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      organization_id,
      visitor_id,
      session_id,
      event_type,
      event_data,
      tracking,
      page,
      device,
      timestamp
    } = body

    if (!organization_id || !visitor_id || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify organization exists
    const { data: org } = await adminClient
      .from('organizations')
      .select('id')
      .eq('id', organization_id)
      .single()

    if (!org) {
      return NextResponse.json(
        { error: 'Invalid organization' },
        { status: 401 }
      )
    }

    // Get client IP and geolocation headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const country = request.headers.get('cf-ipcountry') ||
                   request.headers.get('x-vercel-ip-country')
    const city = request.headers.get('cf-ipcity') ||
                request.headers.get('x-vercel-ip-city')

    // Find or create tracking record for this visitor
    let trackingRecord = await findOrCreateTracking(
      adminClient,
      organization_id,
      visitor_id,
      tracking,
      page,
      device,
      ip,
      country,
      city
    )

    // Store the behavioral event
    const { error: eventError } = await adminClient
      .from('behavioral_events')
      .insert({
        tracking_id: trackingRecord.id,
        organization_id,
        event_type,
        event_name: event_data?.event_name || event_data?.custom_event,
        page_url: page?.url,
        page_title: page?.title,
        time_on_page: event_data?.time_on_page,
        scroll_depth: event_data?.scroll_depth || event_data?.depth,
        content_type: detectContentType(page?.path),
        event_data: event_data || {},
        event_time: timestamp || new Date().toISOString()
      })

    if (eventError) {
      console.error('Failed to store event:', eventError)
    }

    // Update last touch timestamp
    await adminClient
      .from('lead_tracking')
      .update({ last_touch_at: new Date().toISOString() })
      .eq('id', trackingRecord.id)

    // If this is an identify event, try to link to existing lead
    if (event_type === 'identify' && event_data?.email) {
      await linkTrackingToLead(
        adminClient,
        trackingRecord.id,
        organization_id,
        event_data.email
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function findOrCreateTracking(
  client: any,
  organizationId: string,
  visitorId: string,
  tracking: any,
  page: any,
  device: any,
  ip: string,
  country: string | null,
  city: string | null
) {
  // Look for existing tracking by visitor ID or click IDs
  const { data: existing } = await client
    .from('lead_tracking')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`fbclid.eq.${tracking?.fbclid},gclid.eq.${tracking?.gclid},ttclid.eq.${tracking?.ttclid}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Update with any new tracking params
    const updates: any = { last_touch_at: new Date().toISOString() }

    if (tracking?.fbclid && !existing.fbclid) updates.fbclid = tracking.fbclid
    if (tracking?.gclid && !existing.gclid) updates.gclid = tracking.gclid
    if (tracking?.ttclid && !existing.ttclid) updates.ttclid = tracking.ttclid
    if (tracking?.fbp && !existing.fbp) updates.fbp = tracking.fbp
    if (tracking?.fbc && !existing.fbc) updates.fbc = tracking.fbc
    if (tracking?.ttp && !existing.ttp) updates.ttp = tracking.ttp

    await client
      .from('lead_tracking')
      .update(updates)
      .eq('id', existing.id)

    return existing
  }

  // Create new tracking record
  const { data: newTracking, error } = await client
    .from('lead_tracking')
    .insert({
      organization_id: organizationId,
      fbclid: tracking?.fbclid,
      gclid: tracking?.gclid,
      ttclid: tracking?.ttclid,
      msclkid: tracking?.msclkid,
      fbp: tracking?.fbp,
      fbc: tracking?.fbc,
      ttp: tracking?.ttp,
      ga_client_id: tracking?.ga_client_id,
      utm_source: tracking?.utm_source,
      utm_medium: tracking?.utm_medium,
      utm_campaign: tracking?.utm_campaign,
      utm_content: tracking?.utm_content,
      utm_term: tracking?.utm_term,
      landing_page: page?.url,
      referrer: page?.referrer,
      user_agent: device?.user_agent,
      ip_address: ip,
      country,
      city,
      device_type: device?.type,
      browser: device?.browser,
      os: device?.os
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create tracking:', error)
    throw error
  }

  return newTracking
}

async function linkTrackingToLead(
  client: any,
  trackingId: string,
  organizationId: string,
  email: string
) {
  // Find lead by email
  const { data: lead } = await client
    .from('leads')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email.toLowerCase())
    .single()

  if (lead) {
    // Link tracking to lead
    await client
      .from('lead_tracking')
      .update({ lead_id: lead.id })
      .eq('id', trackingId)

    // Update all events for this tracking record
    await client
      .from('behavioral_events')
      .update({ lead_id: lead.id })
      .eq('tracking_id', trackingId)

    // Trigger behavioral score calculation
    await calculateBehavioralScore(client, lead.id, organizationId)
  }
}

function detectContentType(path: string | undefined): string | null {
  if (!path) return null

  const pathLower = path.toLowerCase()

  if (pathLower.includes('/pricing')) return 'pricing'
  if (pathLower.includes('/demo')) return 'demo'
  if (pathLower.includes('/case-stud')) return 'case_study'
  if (pathLower.includes('/feature')) return 'features'
  if (pathLower.includes('/blog')) return 'blog'
  if (pathLower.includes('/doc')) return 'documentation'
  if (pathLower.includes('/contact')) return 'contact'
  if (pathLower.includes('/about')) return 'about'
  if (pathLower.includes('/integrat')) return 'integrations'

  return 'other'
}

async function calculateBehavioralScore(
  client: any,
  leadId: string,
  organizationId: string
) {
  // Get all events for this lead
  const { data: events } = await client
    .from('behavioral_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('event_time', { ascending: true })

  if (!events || events.length === 0) return

  // Calculate metrics
  const pageViews = events.filter(e => e.event_type === 'page_view').length
  const uniquePages = new Set(events.map(e => e.page_url)).size
  const totalTimeOnSite = events
    .filter(e => e.time_on_page)
    .reduce((sum, e) => sum + (e.time_on_page || 0), 0)

  const pricingViews = events.filter(e => e.content_type === 'pricing').length
  const demoViews = events.filter(e => e.content_type === 'demo').length
  const caseStudyViews = events.filter(e => e.content_type === 'case_study').length
  const featureViews = events.filter(e => e.content_type === 'features').length

  const formsStarted = events.filter(e => e.event_type === 'form_start').length
  const formsCompleted = events.filter(e => e.event_type === 'form_submit').length
  const ctaClicks = events.filter(e =>
    ['cta_click', 'pricing_click', 'demo_click', 'signup_click'].includes(e.event_type)
  ).length

  // Calculate time-based metrics
  const firstEvent = events[0]
  const lastEvent = events[events.length - 1]
  const firstVisit = new Date(firstEvent.event_time)
  const lastVisit = new Date(lastEvent.event_time)
  const now = new Date()

  const daysSinceFirst = Math.floor((now.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceLast = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate scores (0-100)
  const engagementScore = Math.min(100, Math.round(
    (pageViews * 5) +
    (uniquePages * 10) +
    (Math.min(totalTimeOnSite / 60, 30) * 2) +
    (ctaClicks * 15)
  ))

  const intentScore = Math.min(100, Math.round(
    (pricingViews * 25) +
    (demoViews * 20) +
    (caseStudyViews * 15) +
    (featureViews * 10) +
    (formsCompleted * 30)
  ))

  const recencyScore = Math.max(0, 100 - (daysSinceLast * 10))

  const visitFrequency = daysSinceFirst > 0 ? pageViews / Math.max(daysSinceFirst, 1) : pageViews
  const frequencyScore = Math.min(100, Math.round(visitFrequency * 20))

  // Combined behavioral score with weights
  const behavioralScore = Math.round(
    (engagementScore * 0.25) +
    (intentScore * 0.40) +
    (recencyScore * 0.20) +
    (frequencyScore * 0.15)
  )

  // Upsert behavioral scores
  const { error } = await client
    .from('behavioral_scores')
    .upsert({
      lead_id: leadId,
      organization_id: organizationId,
      total_page_views: pageViews,
      unique_pages_viewed: uniquePages,
      total_time_on_site: totalTimeOnSite,
      avg_time_per_page: pageViews > 0 ? totalTimeOnSite / pageViews : 0,
      pricing_page_views: pricingViews,
      demo_page_views: demoViews,
      case_study_views: caseStudyViews,
      feature_page_views: featureViews,
      forms_started: formsStarted,
      forms_completed: formsCompleted,
      form_abandonment_rate: formsStarted > 0 ? ((formsStarted - formsCompleted) / formsStarted) * 100 : 0,
      cta_clicks: ctaClicks,
      days_since_first_visit: daysSinceFirst,
      days_since_last_visit: daysSinceLast,
      visit_frequency: visitFrequency,
      engagement_score: engagementScore,
      intent_score: intentScore,
      recency_score: recencyScore,
      frequency_score: frequencyScore,
      behavioral_score: behavioralScore,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'lead_id'
    })

  if (error) {
    console.error('Failed to update behavioral score:', error)
  }

  return behavioralScore
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}
