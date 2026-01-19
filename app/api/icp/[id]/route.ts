import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/icp/[id] - Update an ICP criterion
export async function PATCH(
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

    // Only admins can update criteria
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify criterion belongs to organization
    const { data: existing } = await supabase
      .from('icp_criteria')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Criterion not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, weight, data_type, ideal_values } = body

    // Validate weight if provided
    if (weight !== undefined && (weight < 0 || weight > 100)) {
      return NextResponse.json(
        { error: 'Weight must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (weight !== undefined) updates.weight = weight
    if (data_type !== undefined) updates.data_type = data_type
    if (ideal_values !== undefined) updates.ideal_values = ideal_values

    // Update criterion
    const { data: criterion, error } = await supabase
      .from('icp_criteria')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating criterion:', error)
      return NextResponse.json({ error: 'Failed to update criterion' }, { status: 500 })
    }

    return NextResponse.json({ criterion })
  } catch (error) {
    console.error('ICP PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/icp/[id] - Delete an ICP criterion
export async function DELETE(
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

    // Only admins can delete criteria
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify criterion belongs to organization
    const { data: existing } = await supabase
      .from('icp_criteria')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Criterion not found' }, { status: 404 })
    }

    // Delete criterion
    const { error } = await supabase
      .from('icp_criteria')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting criterion:', error)
      return NextResponse.json({ error: 'Failed to delete criterion' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ICP DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
