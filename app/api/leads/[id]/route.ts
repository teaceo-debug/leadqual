import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerLeadUpdatedWebhook } from '@/lib/webhooks'
import { fireCAPIEvent, getOrgFacebookSettings, leadToTrackingParams } from '@/lib/capi'
import { z } from 'zod'

const updateLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'rejected', 'archived']).optional(),
  notes: z.string().optional(),
})

// GET /api/leads/[id] - Get single lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: leadId } = await params

    // First verify we have an authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get lead
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .single()

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get activity log
    const { data: activity } = await supabase
      .from('activity_log')
      .select(`
        *,
        user:user_id(email, raw_user_meta_data)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ ...lead, activity: activity || [] })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/leads/[id] - Update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: leadId } = await params

    // Get user's organization and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    if (member.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateLeadSchema.parse(body)

    // Get current lead for activity log
    const { data: currentLead } = await supabase
      .from('leads')
      .select('status, notes')
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .single()

    if (!currentLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Update lead
    const { data: lead, error } = await supabase
      .from('leads')
      .update(validatedData)
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update lead:', error)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    // Log activity
    const changes: string[] = []
    if (validatedData.status && validatedData.status !== currentLead.status) {
      changes.push(`status changed from ${currentLead.status} to ${validatedData.status}`)
    }
    if (validatedData.notes !== undefined && validatedData.notes !== currentLead.notes) {
      changes.push('notes updated')
    }

    if (changes.length > 0) {
      await supabase.from('activity_log').insert({
        organization_id: member.organization_id,
        lead_id: leadId,
        user_id: user.id,
        action: 'lead.updated',
        details: { changes },
      })

      // Trigger lead.updated webhook
      triggerLeadUpdatedWebhook(member.organization_id, lead).catch(console.error)

      // Fire Purchase CAPI when lead is converted
      // This builds the highest-quality buyer seed audience for Lookalike targeting
      if (validatedData.status === 'converted' && currentLead.status !== 'converted') {
        firePurchaseCAPI(member.organization_id, lead).catch(console.error)
      }
    }

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Fire ClosedWon (Purchase) CAPI event when a lead converts
// Uses stored fbclid/fbp/fbc from original form submission for attribution
// Sends score as monetary value so Facebook optimizes toward high-value converters
async function firePurchaseCAPI(organizationId: string, lead: Record<string, unknown>) {
  const fb = await getOrgFacebookSettings(organizationId)
  if (!fb) return

  const tp = leadToTrackingParams(lead)
  const score = (lead.score as number) || 0

  await fireCAPIEvent({
    eventName: 'ClosedWon',
    eventId: `closedwon_${lead.id}`,
    actionSource: 'system_generated',
    ...tp,
    score,
    pixelId: fb.pixel_id!,
    accessToken: fb.access_token!,
    testEventCode: fb.test_event_code,
  })
}
