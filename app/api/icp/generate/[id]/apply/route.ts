import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { GeneratedCriterion } from '@/lib/icp-generator'

// POST /api/icp/generate/[id]/apply - Apply generated criteria to organization's ICP
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Only admins can apply ICP
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the generation record
    const { data: generation, error: fetchError } = await supabase
      .from('icp_generations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (fetchError || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    if (generation.status === 'applied') {
      return NextResponse.json(
        { error: 'This generation has already been applied' },
        { status: 400 }
      )
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { replace = true, criteria: overrideCriteria } = body

    // Use override criteria if provided, otherwise use stored criteria
    const criteriaToApply = (overrideCriteria ||
      generation.generated_criteria) as GeneratedCriterion[]

    if (!criteriaToApply || !Array.isArray(criteriaToApply) || criteriaToApply.length === 0) {
      return NextResponse.json(
        { error: 'No criteria to apply' },
        { status: 400 }
      )
    }

    // Start transaction: delete existing and insert new
    if (replace) {
      // Delete existing criteria
      const { error: deleteError } = await supabase
        .from('icp_criteria')
        .delete()
        .eq('organization_id', membership.organization_id)

      if (deleteError) {
        console.error('Error deleting existing criteria:', deleteError)
        return NextResponse.json(
          { error: 'Failed to replace existing criteria' },
          { status: 500 }
        )
      }
    }

    // Insert new criteria with correct DB column names
    const newCriteria = criteriaToApply.map((c: GeneratedCriterion, index: number) => ({
      organization_id: membership.organization_id,
      name: c.name,
      type: c.type,
      description: c.reasoning || null,
      // Convert from percentage (0-100) to database scale (1-10)
      weight: Math.max(1, Math.min(10, Math.round(c.weight / 10))),
      ideal_values: c.ideal_values,
      sort_order: index,
    }))

    const { data: insertedCriteria, error: insertError } = await supabase
      .from('icp_criteria')
      .insert(newCriteria)
      .select()

    if (insertError) {
      console.error('Error inserting criteria:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert new criteria' },
        { status: 500 }
      )
    }

    // Update generation status to applied
    const { error: updateError } = await supabase
      .from('icp_generations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating generation status:', updateError)
      // Don't fail - criteria were inserted successfully
    }

    // Log the activity
    await supabase.from('activity_log').insert({
      organization_id: membership.organization_id,
      user_id: user.id,
      action: 'icp.generated_applied',
      details: {
        generation_id: id,
        generation_type: generation.generation_type,
        criteria_count: insertedCriteria?.length || 0,
        replaced_existing: replace,
      },
    })

    return NextResponse.json({
      success: true,
      criteria: insertedCriteria,
      message: `Successfully applied ${insertedCriteria?.length || 0} ICP criteria`,
    })
  } catch (error) {
    console.error('ICP apply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
