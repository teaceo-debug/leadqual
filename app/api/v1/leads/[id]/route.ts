import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateApiKey, requireScope, logApiUsage, createApiError } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from '@/lib/rate-limiter'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Lead update schema
const updateLeadSchema = z.object({
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
  status: z.enum(['new', 'contacted', 'converted', 'rejected', 'archived']).optional(),
  notes: z.string().optional(),
})

// GET /api/v1/leads/:id - Get single lead
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()
  const { id } = await params

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'leads:read')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'GET', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'GET', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const adminClient = createAdminClient()

    const { data: lead, error } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('organization_id', auth.organization_id)
      .single()

    if (error || !lead) {
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'GET', 404, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Lead not found' } },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'GET', 200, Date.now() - startTime, request)

    return NextResponse.json(
      { data: lead },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error fetching lead:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'GET', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/leads/:id - Update lead
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()
  const { id } = await params

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'leads:write')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 429, Date.now() - startTime, request)
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
      validatedData = updateLeadSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 400, Date.now() - startTime, request)
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

    if (Object.keys(validatedData).length === 0) {
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 400, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'No valid fields to update' } },
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const adminClient = createAdminClient()

    // Check if lead exists and belongs to organization
    const { data: existingLead } = await adminClient
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('organization_id', auth.organization_id)
      .single()

    if (!existingLead) {
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 404, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Lead not found' } },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Update lead
    const { data: lead, error } = await adminClient
      .from('leads')
      .update({
        ...validatedData,
        company_website: validatedData.company_website === '' ? null : validatedData.company_website,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to update lead:', error)
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 500, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Failed to update lead' } },
        { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 200, Date.now() - startTime, request)

    return NextResponse.json(
      { data: lead },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error updating lead:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'PATCH', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/leads/:id - Archive lead
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()
  const { id } = await params

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'leads:write')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'DELETE', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'DELETE', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const adminClient = createAdminClient()

    // Check if lead exists and belongs to organization
    const { data: existingLead } = await adminClient
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('organization_id', auth.organization_id)
      .single()

    if (!existingLead) {
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'DELETE', 404, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Lead not found' } },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Archive lead (soft delete)
    const { error } = await adminClient
      .from('leads')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) {
      console.error('Failed to archive lead:', error)
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'DELETE', 500, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Failed to archive lead' } },
        { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'DELETE', 200, Date.now() - startTime, request)

    return NextResponse.json(
      { data: { id, status: 'archived' } },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error archiving lead:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}`, 'DELETE', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
