import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/leads/[id]/requalify - Re-run qualification
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

    if (member.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify lead exists and belongs to org
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .single()

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Update qualification status
    await supabase
      .from('leads')
      .update({ qualification_status: 'pending' })
      .eq('id', leadId)

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: member.organization_id,
      lead_id: leadId,
      user_id: user.id,
      action: 'lead.requalify_requested',
      details: {},
    })

    // Trigger qualification job
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId }),
    }).catch(console.error)

    return NextResponse.json({ success: true, message: 'Qualification started' }, { status: 202 })
  } catch (error) {
    console.error('Error triggering requalification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
