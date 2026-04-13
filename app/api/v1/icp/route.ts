import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateApiKey, requireScope, logApiUsage, createApiError } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from '@/lib/rate-limiter'

// GET /api/v1/icp - Get ICP criteria
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'icp:read')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/icp', 'GET', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/icp', 'GET', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const adminClient = createAdminClient()

    const { data: criteria, error } = await adminClient
      .from('icp_criteria')
      .select('id, name, type, weight, acceptable_values, is_required, sort_order, created_at, updated_at')
      .eq('organization_id', auth.organization_id)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch ICP criteria:', error)
      logApiUsage(auth.api_key_id, auth.organization_id, '/v1/icp', 'GET', 500, Date.now() - startTime, request)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Failed to fetch ICP criteria' } },
        { status: 500, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/icp', 'GET', 200, Date.now() - startTime, request)

    return NextResponse.json(
      {
        data: criteria,
        meta: {
          total: criteria.length,
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error fetching ICP criteria:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/icp', 'GET', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
