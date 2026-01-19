import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shouldRetrainModel, updateScoringModel } from '@/lib/learn'
import { z } from 'zod'

const outcomeSchema = z.object({
  outcome_type: z.enum(['converted', 'rejected', 'no_response', 'qualified_out', 'in_progress']),
  outcome_value: z.number().optional(),
  days_to_outcome: z.number().optional(),
  notes: z.string().optional(),
})

// POST /api/leads/[id]/outcome - Record an outcome for a lead
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

    // Only admins and managers can record outcomes
    if (member.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify lead belongs to organization
    const { data: lead } = await supabase
      .from('leads')
      .select('id, organization_id, created_at')
      .eq('id', leadId)
      .eq('organization_id', member.organization_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = outcomeSchema.parse(body)

    // Calculate days to outcome if not provided
    let daysToOutcome = validatedData.days_to_outcome
    if (daysToOutcome === undefined && lead.created_at) {
      const createdDate = new Date(lead.created_at)
      const now = new Date()
      daysToOutcome = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Insert outcome
    const { data: outcome, error: outcomeError } = await supabase
      .from('lead_outcomes')
      .insert({
        lead_id: leadId,
        outcome_type: validatedData.outcome_type,
        outcome_value: validatedData.outcome_value,
        days_to_outcome: daysToOutcome,
        notes: validatedData.notes,
        recorded_by: user.id,
      })
      .select()
      .single()

    if (outcomeError) {
      console.error('Failed to insert outcome:', outcomeError)
      return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 })
    }

    // Update lead status to match outcome
    const statusMap: Record<string, string> = {
      converted: 'converted',
      rejected: 'rejected',
      no_response: 'archived',
      qualified_out: 'rejected',
      in_progress: 'contacted',
    }

    const newStatus = statusMap[validatedData.outcome_type]
    if (newStatus) {
      await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: member.organization_id,
      lead_id: leadId,
      user_id: user.id,
      action: 'outcome.recorded',
      details: {
        outcome_type: validatedData.outcome_type,
        outcome_value: validatedData.outcome_value,
      },
    })

    // Check if we should trigger retraining
    const shouldRetrain = await shouldRetrainModel(member.organization_id)
    let retrainingTriggered = false

    if (shouldRetrain) {
      // Trigger retraining in background (don't await)
      updateScoringModel(member.organization_id)
        .then(result => {
          if (result.success) {
            console.log(`Model retrained for org ${member.organization_id}, version ${result.model?.modelVersion}`)
          } else {
            console.warn(`Model retraining failed for org ${member.organization_id}:`, result.error)
          }
        })
        .catch(console.error)

      retrainingTriggered = true
    }

    return NextResponse.json({
      success: true,
      outcome,
      retrainingTriggered,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error recording outcome:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/leads/[id]/outcome - Get outcomes for a lead
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

    // Get outcomes
    const { data: outcomes, error } = await supabase
      .from('lead_outcomes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch outcomes:', error)
      return NextResponse.json({ error: 'Failed to fetch outcomes' }, { status: 500 })
    }

    return NextResponse.json({ outcomes: outcomes || [] })
  } catch (error) {
    console.error('Error fetching outcomes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
