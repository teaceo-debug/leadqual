import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerLeadUpdatedWebhook } from '@/lib/webhooks'
import { createHash } from 'crypto'
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

// Fire a Purchase event to Facebook CAPI when a lead converts
// This builds the highest-quality seed audience (actual buyers) for Lookalike targeting
async function firePurchaseCAPI(organizationId: string, lead: Record<string, unknown>) {
  const admin = createAdminClient()

  // Find forms with Facebook settings for this org
  const { data: forms } = await admin
    .from('forms')
    .select('facebook')
    .eq('organization_id', organizationId)
    .not('facebook', 'eq', '{}')

  if (!forms || forms.length === 0) return

  const fb = forms[0].facebook as { pixel_id?: string; access_token?: string; test_event_code?: string }
  if (!fb?.pixel_id || !fb?.access_token) return

  const hash = (v: string) => v ? createHash('sha256').update(v.toLowerCase().trim()).digest('hex') : ''
  const email = lead.email as string || ''
  const phone = ((lead.phone as string) || '').replace(/\D/g, '')
  const phoneNorm = phone.length === 10 ? '1' + phone : phone

  const userData: Record<string, unknown> = {}
  if (email) userData.em = [hash(email)]
  if (phoneNorm) userData.ph = [hash(phoneNorm)]
  if (lead.first_name) userData.fn = [hash(lead.first_name as string)]
  if (lead.last_name) userData.ln = [hash(lead.last_name as string)]
  if (lead.source_ip) userData.client_ip_address = lead.source_ip
  if (lead.user_agent) userData.client_user_agent = lead.user_agent

  const eventId = `purchase_${lead.id}`
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      user_data: userData,
      custom_data: { currency: 'USD' },
    }],
    ...(fb.test_event_code ? { test_event_code: fb.test_event_code } : {}),
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${fb.pixel_id}/events?access_token=${fb.access_token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  console.log(`Purchase CAPI fired for lead ${lead.id}:`, await res.json().catch(() => ({})))
}
