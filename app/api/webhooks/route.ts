import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// GET /api/webhooks - Get all webhooks for the organization
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

    // Only admins can view webhooks
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Webhooks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/webhooks - Create a new webhook
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

    // Only admins can create webhooks
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { url, events } = body

    if (!url || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'URL and at least one event are required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Generate secret
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`

    // Create webhook
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        organization_id: membership.organization_id,
        url,
        events,
        secret,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating webhook:', error)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Webhooks POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
