import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateApiKey, logApiUsage, createApiError } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError, getRateLimitStatus } from '@/lib/rate-limiter'
import { subDays, format } from 'date-fns'

// GET /api/v1/usage - Get API usage statistics
// This endpoint doesn't require any special scope - all API keys can view their own usage
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/usage', 'GET', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(30, Math.max(1, parseInt(searchParams.get('days') || '7')))

    const adminClient = createAdminClient()
    const now = new Date()
    const startDate = subDays(now, days)

    // Get usage data for this API key
    const { data: usage, error } = await adminClient
      .from('api_usage')
      .select('endpoint, method, status_code, response_time_ms, created_at')
      .eq('api_key_id', auth.api_key_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Calculate statistics
    const totalRequests = usage?.length || 0
    const successfulRequests = usage?.filter(u => u.status_code >= 200 && u.status_code < 300).length || 0
    const failedRequests = usage?.filter(u => u.status_code >= 400 && u.status_code < 500).length || 0
    const rateLimitedRequests = usage?.filter(u => u.status_code === 429).length || 0
    const serverErrors = usage?.filter(u => u.status_code >= 500).length || 0

    // Average response time
    const responseTimes = usage?.filter(u => u.response_time_ms !== null).map(u => u.response_time_ms!) || []
    const averageResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length)
      : 0

    // Requests by day
    const requestsByDay: { date: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(now, i), 'yyyy-MM-dd')
      const count = usage?.filter(u => u.created_at.startsWith(date)).length || 0
      requestsByDay.push({ date, count })
    }

    // Requests by endpoint
    const endpointCounts = new Map<string, number>()
    usage?.forEach(u => {
      const key = `${u.method} ${u.endpoint}`
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1)
    })
    const requestsByEndpoint = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Current rate limit status
    const currentRateLimitStatus = getRateLimitStatus(auth.api_key_id, auth.rate_limit)

    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/usage', 'GET', 200, Date.now() - startTime, request)

    return NextResponse.json(
      {
        data: {
          summary: {
            total_requests: totalRequests,
            successful_requests: successfulRequests,
            failed_requests: failedRequests,
            rate_limited_requests: rateLimitedRequests,
            server_errors: serverErrors,
            average_response_time_ms: averageResponseTime,
          },
          rate_limit: {
            limit: currentRateLimitStatus.limit,
            remaining: currentRateLimitStatus.remaining,
            reset: currentRateLimitStatus.reset,
          },
          requests_by_day: requestsByDay,
          requests_by_endpoint: requestsByEndpoint,
        },
        meta: {
          period_days: days,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(now, 'yyyy-MM-dd'),
        },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Error fetching usage:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/usage', 'GET', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
