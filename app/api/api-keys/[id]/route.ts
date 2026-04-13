import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/api-keys/:id - Get single API key details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Get the API key
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at, revoked_at')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (error || !apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    return NextResponse.json({ data: apiKey })
  } catch (error) {
    console.error('API key GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/api-keys/:id - Revoke an API key
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Only admins can revoke API keys
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if the key exists and belongs to the organization
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id, revoked_at')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (existingKey.revoked_at) {
      return NextResponse.json({ error: 'API key is already revoked' }, { status: 400 })
    }

    // Revoke the API key (soft delete)
    const { error } = await supabase
      .from('api_keys')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        is_active: false,
      })
      .eq('id', id)

    if (error) {
      console.error('Error revoking API key:', error)
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    }

    return NextResponse.json({ message: 'API key revoked successfully' })
  } catch (error) {
    console.error('API key DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/api-keys/:id - Update API key settings (name, scopes, rate_limit)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Only admins can update API keys
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if the key exists, belongs to the organization, and is not revoked
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id, revoked_at')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (existingKey.revoked_at) {
      return NextResponse.json({ error: 'Cannot update a revoked API key' }, { status: 400 })
    }

    const body = await request.json()
    const allowedFields = ['name', 'is_active']

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update the API key
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id)
      .select('id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at, revoked_at')
      .single()

    if (error) {
      console.error('Error updating API key:', error)
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
    }

    return NextResponse.json({ data: apiKey })
  } catch (error) {
    console.error('API key PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
