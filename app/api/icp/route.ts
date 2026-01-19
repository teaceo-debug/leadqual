import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/icp - Get all ICP criteria for the organization
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get ICP criteria
    const { data: dbCriteria, error } = await supabase
      .from('icp_criteria')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('weight', { ascending: false })

    if (error) {
      console.error('Error fetching ICP criteria:', error)
      return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 })
    }

    // Map database fields to frontend types
    const criteria = dbCriteria?.map((c) => ({
      ...c,
      data_type: c.type,
      ideal_values: c.ideal_values || [],
      weight: c.weight * 10, // Convert from 1-10 to percentage
    })) || []

    return NextResponse.json({ criteria })
  } catch (error) {
    console.error('ICP GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/icp - Create a new ICP criterion
export async function POST(request: NextRequest) {
  try {
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

    // Only admins can create criteria
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, weight, data_type, type, ideal_values } = body

    // Support both 'type' and 'data_type' for backwards compatibility
    const criterionType = type || data_type

    if (!name || weight === undefined || !criterionType) {
      return NextResponse.json(
        { error: 'Name, weight, and type are required' },
        { status: 400 }
      )
    }

    // Convert weight from percentage (0-100) to database scale (1-10)
    const dbWeight = Math.max(1, Math.min(10, Math.round(weight / 10)))

    // Create criterion
    const { data: criterion, error } = await supabase
      .from('icp_criteria')
      .insert({
        organization_id: membership.organization_id,
        name,
        description,
        weight: dbWeight,
        type: criterionType,
        ideal_values: ideal_values || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating criterion:', error)
      return NextResponse.json({ error: 'Failed to create criterion' }, { status: 500 })
    }

    return NextResponse.json({ criterion }, { status: 201 })
  } catch (error) {
    console.error('ICP POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
