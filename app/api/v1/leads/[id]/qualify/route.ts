import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateApiKey, requireScope, logApiUsage, createApiError } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from '@/lib/rate-limiter'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/leads/:id/qualify - Re-qualify a lead
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const adminClient = createAdminClient()

    // Check if lead exists and belongs to organization
    const { data: lead, error: fetchError } = await adminClient
      .from('leads')
      .select('id, qualification_status')
      .eq('id', id)
      .eq('organization_id', auth.organization_id)
      .single()

    if (fetchError || !lead) {
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 404, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Lead not found' } },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Check if already processing
    if (lead.qualification_status === 'processing') {
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 409, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'already_processing', message: 'Lead is already being qualified' } },
        { status: 409, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Reset qualification status to pending
    const { error: updateError } = await adminClient
      .from('leads')
      .update({
        qualification_status: 'pending',
        score: null,
        label: null,
        reasoning: null,
        breakdown: null,
        recommended_action: null,
        qualified_at: null,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to reset lead qualification:', updateError)
      logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 500, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Failed to initiate re-qualification' } },
        { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Trigger qualification job (async, non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id }),
    }).catch(console.error)

    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 202, Date.now() - startTime, request)

    return NextResponse.json(
      {
        data: {
          id,
          qualification_status: 'pending',
          message: 'Lead qualification has been initiated',
        },
      },
      { status: 202, headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error re-qualifying lead:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, `/v1/leads/${id}/qualify`, 'POST', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
