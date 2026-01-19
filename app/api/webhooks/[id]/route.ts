import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// PATCH /api/webhooks/[id] - Update a webhook
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

    // Only admins can update webhooks
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify webhook belongs to organization
    const { data: existing } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const body = await request.json()
    const { url, events, is_active, regenerate_secret } = body

    // Validate URL if provided
    if (url) {
      try {
        new URL(url)
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (url !== undefined) updates.url = url
    if (events !== undefined) updates.events = events
    if (is_active !== undefined) updates.is_active = is_active
    if (regenerate_secret) {
      updates.secret = `whsec_${crypto.randomBytes(24).toString('hex')}`
    }

    // Update webhook
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating webhook:', error)
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
    }

    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Webhook PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/webhooks/[id] - Delete a webhook
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

    // Only admins can delete webhooks
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify webhook belongs to organization
    const { data: existing } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Delete webhook
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting webhook:', error)
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
