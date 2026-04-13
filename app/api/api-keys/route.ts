import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey, ALL_SCOPES, validateScopes } from '@/lib/api-keys'
import { z } from 'zod'

// GET /api/api-keys - List API keys for organization
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

    // Get all API keys for the organization (excluding revoked ones by default)
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at, revoked_at')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    return NextResponse.json({ data: apiKeys })
  } catch (error) {
    console.error('API keys GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Validation schema for creating API key
const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),
  rate_limit: z.number().int().min(100).max(100000).optional().default(1000),
  expires_at: z.string().datetime().optional().nullable(),
})

// POST /api/api-keys - Create a new API key
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

    // Only admins can create API keys
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    let validatedData
    try {
      validatedData = createKeySchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.issues },
          { status: 400 }
        )
      }
      throw error
    }

    // Validate scopes
    if (!validateScopes(validatedData.scopes)) {
      return NextResponse.json(
        {
          error: 'Invalid scopes',
          details: { allowed_scopes: ALL_SCOPES },
        },
        { status: 400 }
      )
    }

    // Generate the API key
    const { key, keyHash, keyPrefix } = generateApiKey('live')

    // Insert the API key
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: membership.organization_id,
        name: validatedData.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: validatedData.scopes,
        rate_limit: validatedData.rate_limit,
        expires_at: validatedData.expires_at || null,
        created_by: user.id,
      })
      .select('id, name, key_prefix, scopes, rate_limit, expires_at, created_at')
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return the full key (only time it will be shown)
    return NextResponse.json({
      data: {
        ...apiKey,
        key, // The actual key - shown only once
      },
      message: 'API key created successfully. Make sure to copy the key now - it will not be shown again.',
    }, { status: 201 })
  } catch (error) {
    console.error('API keys POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
