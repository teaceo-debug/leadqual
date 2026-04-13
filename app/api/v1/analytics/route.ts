import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateApiKey, requireScope, logApiUsage, createApiError } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders, createRateLimitError } from '@/lib/rate-limiter'
import { subDays, format } from 'date-fns'

// GET /api/v1/analytics - Get analytics data
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Authenticate
  const authResult = await authenticateApiKey(request)
  if ('error' in authResult) {
    return NextResponse.json(createApiError(authResult.error), { status: authResult.error.status })
  }

  const { auth } = authResult

  // Check scope
  const scopeError = requireScope(auth, 'analytics:read')
  if (scopeError) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/analytics', 'GET', 403, Date.now() - startTime, request)
    return NextResponse.json(createApiError(scopeError), { status: scopeError.status })
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(auth.api_key_id, auth.rate_limit)
  if (!rateLimitResult.allowed) {
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/analytics', 'GET', 429, Date.now() - startTime, request)
    return NextResponse.json(createRateLimitError(rateLimitResult), {
      status: 429,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30')))

    const adminClient = createAdminClient()
    const now = new Date()
    const startDate = subDays(now, days)
    const previousStartDate = subDays(startDate, days)

    // Get current period leads
    const { data: currentLeads, error: currentError } = await adminClient
      .from('leads')
      .select('id, score, label, status, created_at')
      .eq('organization_id', auth.organization_id)
      .gte('created_at', startDate.toISOString())

    if (currentError) {
      throw currentError
    }

    // Get previous period leads for comparison
    const { data: previousLeads, error: previousError } = await adminClient
      .from('leads')
      .select('id, score, label, status')
      .eq('organization_id', auth.organization_id)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    if (previousError) {
      throw previousError
    }

    // Calculate metrics
    const totalLeads = currentLeads?.length || 0
    const previousTotalLeads = previousLeads?.length || 0
    const totalLeadsChange = previousTotalLeads > 0
      ? Math.round(((totalLeads - previousTotalLeads) / previousTotalLeads) * 100)
      : 0

    const hotLeads = currentLeads?.filter(l => l.label === 'hot').length || 0
    const previousHotLeads = previousLeads?.filter(l => l.label === 'hot').length || 0
    const hotLeadsChange = previousHotLeads > 0
      ? Math.round(((hotLeads - previousHotLeads) / previousHotLeads) * 100)
      : 0

    const warmLeads = currentLeads?.filter(l => l.label === 'warm').length || 0
    const coldLeads = currentLeads?.filter(l => l.label === 'cold').length || 0

    const convertedLeads = currentLeads?.filter(l => l.status === 'converted').length || 0
    const previousConverted = previousLeads?.filter(l => l.status === 'converted').length || 0
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
    const previousConversionRate = previousTotalLeads > 0
      ? Math.round((previousConverted / previousTotalLeads) * 100)
      : 0
    const conversionRateChange = conversionRate - previousConversionRate

    const scoresWithValues = currentLeads?.filter(l => l.score !== null) || []
    const averageScore = scoresWithValues.length > 0
      ? Math.round(scoresWithValues.reduce((sum, l) => sum + (l.score || 0), 0) / scoresWithValues.length)
      : 0
    const previousScores = previousLeads?.filter(l => l.score !== null) || []
    const previousAverageScore = previousScores.length > 0
      ? Math.round(previousScores.reduce((sum, l) => sum + (l.score || 0), 0) / previousScores.length)
      : 0
    const averageScoreChange = averageScore - previousAverageScore

    // Leads by day
    const leadsByDay: { date: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(now, i), 'yyyy-MM-dd')
      const count = currentLeads?.filter(l => l.created_at.startsWith(date)).length || 0
      leadsByDay.push({ date, count })
    }

    // Score distribution
    const scoreDistribution = [
      { range: '0-20', count: scoresWithValues.filter(l => (l.score || 0) <= 20).length },
      { range: '21-40', count: scoresWithValues.filter(l => (l.score || 0) > 20 && (l.score || 0) <= 40).length },
      { range: '41-60', count: scoresWithValues.filter(l => (l.score || 0) > 40 && (l.score || 0) <= 60).length },
      { range: '61-80', count: scoresWithValues.filter(l => (l.score || 0) > 60 && (l.score || 0) <= 80).length },
      { range: '81-100', count: scoresWithValues.filter(l => (l.score || 0) > 80).length },
    ]

    // Label distribution
    const labelDistribution = [
      { label: 'hot', count: hotLeads },
      { label: 'warm', count: warmLeads },
      { label: 'cold', count: coldLeads },
    ]

    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/analytics', 'GET', 200, Date.now() - startTime, request)

    return NextResponse.json(
      {
        data: {
          summary: {
            total_leads: totalLeads,
            total_leads_change: totalLeadsChange,
            hot_leads: hotLeads,
            hot_leads_change: hotLeadsChange,
            conversion_rate: conversionRate,
            conversion_rate_change: conversionRateChange,
            average_score: averageScore,
            average_score_change: averageScoreChange,
          },
          leads_by_day: leadsByDay,
          score_distribution: scoreDistribution,
          label_distribution: labelDistribution,
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
    console.error('Error fetching analytics:', error)
    logApiUsage(auth.api_key_id, auth.organization_id, '/v1/analytics', 'GET', 500, Date.now() - startTime, request)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
