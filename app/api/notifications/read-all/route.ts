import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications read-all POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
