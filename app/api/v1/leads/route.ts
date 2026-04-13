import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateApiKey, requireScope, logApiUsage, createApiError } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from '@/lib/rate-limiter'
import { triggerLeadCreatedWebhook } from '@/lib/webhooks'
import { z } from 'zod'

// Lead creation schema
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

// GET /api/v1/leads - List leads with filters and pagination
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'leads:read')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'GET', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'GET', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '50')))
    const label = searchParams.get('label')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const minScore = searchParams.get('min_score')
    const maxScore = searchParams.get('max_score')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const adminClient = createAdminClient()

    // Build query
    let query = adminClient
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organization_id)

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
    const allowedSortFields = ['created_at', 'updated_at', 'score', 'email', 'company_name']
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at'
    query = query.order(sortField, { ascending: order === 'asc' })

    // Apply pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data: leads, error, count } = await query

    if (error) {
      console.error('Failed to fetch leads:', error)
      logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'GET', 500, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Failed to fetch leads' } },
        { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'GET', 200, Date.now() - startTime, request)

    return NextResponse.json(
      {
        data: leads,
        meta: {
          page,
          per_page: perPage,
          total: count || 0,
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error fetching leads:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'GET', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// POST /api/v1/leads - Create a new lead
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'leads:write')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'POST', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'POST', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const body = await request.json()

    // Validate request body
    let validatedData
    try {
      validatedData = leadSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'POST', 400, Date.now() - startTime, request)
        return NextResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Invalid request body',
              details: error.issues,
            },
          },
          { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
        )
      }
      throw error
    }

    const adminClient = createAdminClient()

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || null

    // Create lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .insert({
        organization_id: auth.organization_id,
        ...validatedData,
        company_website: validatedData.company_website || null,
        source_ip: ip,
        user_agent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      })
      .select('*')
      .single()

    if (leadError) {
      console.error('Failed to create lead:', leadError)
      logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'POST', 500, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Failed to create lead' } },
        { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Trigger webhook (async, non-blocking)
    triggerLeadCreatedWebhook(auth.organization_id, lead).catch(console.error)

    // Trigger qualification (async, non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    }).catch(console.error)

    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'POST', 201, Date.now() - startTime, request)

    return NextResponse.json(
      { data: lead },
      { status: 201, headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error creating lead:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/leads', 'POST', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
