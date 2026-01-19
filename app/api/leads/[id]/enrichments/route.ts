import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLeadEnrichments, enrichLead } from '@/lib/enrich'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/leads/[id]/enrichments - Get enrichments for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const leadId = params.id

    // Get user's organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Verify lead belongs to organization
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get all enrichments from database
    const adminSupabase = createAdminClient()
    const { data: enrichments, error } = await adminSupabase
      .from('lead_enrichments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch enrichments:', error)
      return NextResponse.json({ error: 'Failed to fetch enrichments' }, { status: 500 })
    }

    // Group enrichments by type (return most recent of each type)
    const grouped: Record<string, {
      data: Record<string, unknown>
      confidence: number | null
      source: string
      created_at: string
    }> = {}

    for (const e of enrichments || []) {
      if (!grouped[e.enrichment_type]) {
        grouped[e.enrichment_type] = {
          data: e.data,
          confidence: e.confidence,
          source: e.source,
          created_at: e.created_at,
        }
      }
    }

    return NextResponse.json({
      enrichments: grouped,
      raw: enrichments || [],
    })
  } catch (error) {
    console.error('Error fetching enrichments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leads/[id]/enrichments - Trigger enrichment for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const leadId = params.id

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

    // Only admins and managers can trigger enrichment
    if (member.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get lead data
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Run enrichment
    const enrichments = await enrichLead(lead)

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: member.organization_id,
      lead_id: leadId,
      user_id: user.id,
      action: 'lead.enriched',
      details: {
        has_company: !!enrichments.company,
        has_intent: !!enrichments.intent,
      },
    })

    return NextResponse.json({
      success: true,
      enrichments,
    })
  } catch (error) {
    console.error('Error triggering enrichment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
