import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/team/invite/[id] - Cancel an invitation
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

    // Only admins can cancel invitations
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify invitation belongs to organization
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .eq('status', 'pending')
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Cancel invitation
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      console.error('Error cancelling invitation:', error)
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invitation DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
