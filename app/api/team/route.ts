import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/team - Get all team members for the organization
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
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get all team members
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        created_at
      `)
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get user details for each member
    const memberIds = members.map((m) => m.user_id)
    const { data: users } = await supabase.auth.admin.listUsers()

    const membersWithDetails = members.map((member) => {
      const userDetails = users?.users.find((u) => u.id === member.user_id)
      return {
        ...member,
        email: userDetails?.email || 'Unknown',
        full_name: userDetails?.user_metadata?.full_name || null,
      }
    })

    // Get pending invitations
    const { data: invitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      members: membersWithDetails,
      invitations: invitations || [],
      currentUserRole: membership.role,
    })
  } catch (error) {
    console.error('Team GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
