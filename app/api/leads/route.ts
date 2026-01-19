import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerLeadCreatedWebhook } from '@/lib/webhooks'
import { z } from 'zod'

const leadSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  company_name: z.string().optional(),
  company_website: z.string().url().optional().or(z.literal('')),
  company_size: z.string().optional(),
  industry: z.string().optional(),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
  challenge: z.string().optional(),
})

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 10

  const record = rateLimitStore.get(ip)
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// POST /api/leads - Public endpoint for lead submission
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    // Honeypot check
    if (body.website) {
      // Bot detected, silently accept
      return NextResponse.json({ success: true, lead_id: 'fake' })
    }

    const validatedData = leadSchema.parse(body)

    // Use admin client to bypass RLS for public submissions
    const adminClient = createAdminClient()

    // Verify API key or org ID and get organization
    // Support both public_api_key (pk_xxx) and organization ID (uuid)
    let org: { id: string } | null = null

    if (apiKey.startsWith('pk_')) {
      // Lookup by public API key
      const { data, error: orgError } = await adminClient
        .from('organizations')
        .select('id')
        .eq('public_api_key', apiKey)
        .single()

      if (!orgError && data) {
        org = data
      }
    } else {
      // Lookup by organization ID (for hosted form URLs)
      const { data, error: orgError } = await adminClient
        .from('organizations')
        .select('id')
        .eq('id', apiKey)
        .single()

      if (!orgError && data) {
        org = data
      }
    }

    if (!org) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Create lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .insert({
        organization_id: org.id,
        ...validatedData,
        company_website: validatedData.company_website || null,
        source_ip: ip,
        user_agent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      })
      .select('id')
      .single()

    if (leadError) {
      console.error('Failed to create lead:', leadError)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    // Trigger lead.created webhook (async, non-blocking)
    triggerLeadCreatedWebhook(org.id, {
      id: lead.id,
      organization_id: org.id,
      ...validatedData,
    }).catch(console.error)

    // Trigger qualification job (async)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    }).catch(console.error)

    return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Lead creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/leads - List leads (protected)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // First verify we have an authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    const label = searchParams.get('label')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const minScore = searchParams.get('min_score')
    const maxScore = searchParams.get('max_score')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    // Use admin client for leads query to bypass RLS
    // Security is maintained via manual org membership verification above
    const adminClient = createAdminClient()

    // Build query
    let query = adminClient
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', member.organization_id)

    if (label) query = query.eq('label', label)
    if (status) query = query.eq('status', status)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)
    if (minScore) query = query.gte('score', parseInt(minScore))
    if (maxScore) query = query.lte('score', parseInt(maxScore))
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`
      )
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: leads, error, count } = await query

    if (error) {
      console.error('Failed to fetch leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({
      data: leads,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
