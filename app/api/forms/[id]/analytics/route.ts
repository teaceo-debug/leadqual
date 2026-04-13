import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/forms/[id]/analytics - Get form analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const admin = createAdminClient()

    // Verify form belongs to org
    const { data: form } = await admin
      .from('forms')
      .select('id, submission_count, view_count')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Get submissions over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: submissions } = await admin
      .from('form_submissions')
      .select('created_at, data, qualification_status, lead_id')
      .eq('form_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const { data: views } = await admin
      .from('form_views')
      .select('created_at')
      .eq('form_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Group by day
    const dayMap: Record<string, { views: number; submissions: number; qualified: number }> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      const key = d.toISOString().split('T')[0]
      dayMap[key] = { views: 0, submissions: 0, qualified: 0 }
    }

    for (const v of views || []) {
      const key = v.created_at.split('T')[0]
      if (dayMap[key]) dayMap[key].views++
    }

    for (const s of submissions || []) {
      const key = s.created_at.split('T')[0]
      if (dayMap[key]) {
        dayMap[key].submissions++
        if (s.qualification_status === 'completed' && s.lead_id) {
          dayMap[key].qualified++
        }
      }
    }

    const daily = Object.entries(dayMap).map(([date, data]) => ({ date, ...data }))

    // Field completion rates
    const allSubmissions = submissions || []
    const fieldCompletionMap: Record<string, { filled: number; total: number }> = {}
    for (const s of allSubmissions) {
      const data = s.data as Record<string, unknown>
      for (const [key, value] of Object.entries(data)) {
        if (!fieldCompletionMap[key]) fieldCompletionMap[key] = { filled: 0, total: 0 }
        fieldCompletionMap[key].total++
        if (value && String(value).trim()) fieldCompletionMap[key].filled++
      }
    }

    const fieldCompletion = Object.entries(fieldCompletionMap).map(([field, data]) => ({
      field,
      rate: data.total > 0 ? Math.round((data.filled / data.total) * 100) : 0,
      filled: data.filled,
      total: data.total,
    }))

    // Top UTM sources
    const { data: utmData } = await admin
      .from('form_submissions')
      .select('utm_source, utm_medium, utm_campaign')
      .eq('form_id', id)
      .not('utm_source', 'is', null)

    const sourceMap: Record<string, number> = {}
    for (const u of utmData || []) {
      const key = u.utm_source || 'direct'
      sourceMap[key] = (sourceMap[key] || 0) + 1
    }
    const topSources = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const totalViews = form.view_count || (views || []).length
    const totalSubmissions = form.submission_count || allSubmissions.length
    const conversionRate = totalViews > 0 ? Math.round((totalSubmissions / totalViews) * 100) : 0

    return NextResponse.json({
      overview: {
        total_views: totalViews,
        total_submissions: totalSubmissions,
        conversion_rate: conversionRate,
        qualified_count: allSubmissions.filter((s) => s.qualification_status === 'completed' && s.lead_id).length,
      },
      daily,
      field_completion: fieldCompletion,
      top_sources: topSources,
    })
  } catch (error) {
    console.error('Form analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
