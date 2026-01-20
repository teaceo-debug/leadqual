import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/analytics - Get analytics data for the organization
export async function GET(request: NextRequest) {
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
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // Get daily lead counts
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, label, score, industry, company_size, source')
      .eq('organization_id', membership.organization_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Aggregate by day
    const dailyData: Record<string, { date: string; total: number; hot: number; warm: number; cold: number }> = {}

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyData[dateStr] = { date: dateStr, total: 0, hot: 0, warm: 0, cold: 0 }
    }

    if (leads) {
      for (const lead of leads) {
        const dateStr = new Date(lead.created_at).toISOString().split('T')[0]
        if (dailyData[dateStr]) {
          dailyData[dateStr].total++
          if (lead.label === 'hot') dailyData[dateStr].hot++
          else if (lead.label === 'warm') dailyData[dateStr].warm++
          else if (lead.label === 'cold') dailyData[dateStr].cold++
        }
      }
    }

    const leadTrends = Object.values(dailyData)

    // Aggregate by industry
    const industryData: Record<string, number> = {}
    if (leads) {
      for (const lead of leads) {
        const industry = lead.industry || 'Unknown'
        industryData[industry] = (industryData[industry] || 0) + 1
      }
    }
    const industryBreakdown = Object.entries(industryData)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // Aggregate by company size
    const sizeData: Record<string, number> = {}
    if (leads) {
      for (const lead of leads) {
        const size = lead.company_size || 'Unknown'
        sizeData[size] = (sizeData[size] || 0) + 1
      }
    }
    const companySizeBreakdown = Object.entries(sizeData)
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count)

    // Aggregate by source
    const sourceData: Record<string, number> = {}
    if (leads) {
      for (const lead of leads) {
        const source = lead.source || 'form'
        sourceData[source] = (sourceData[source] || 0) + 1
      }
    }
    const sourceBreakdown = Object.entries(sourceData)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    // Score distribution
    const scoreRanges = [
      { range: '90-100', min: 90, max: 100 },
      { range: '80-89', min: 80, max: 89 },
      { range: '70-79', min: 70, max: 79 },
      { range: '60-69', min: 60, max: 69 },
      { range: '50-59', min: 50, max: 59 },
      { range: '40-49', min: 40, max: 49 },
      { range: '30-39', min: 30, max: 39 },
      { range: '0-29', min: 0, max: 29 },
    ]

    const scoreDistribution = scoreRanges.map((range) => {
      const count = (leads || []).filter(
        (l) => l.score !== null && l.score >= range.min && l.score <= range.max
      ).length
      return { range: range.range, count }
    })

    return NextResponse.json({
      leadTrends,
      industryBreakdown,
      companySizeBreakdown,
      sourceBreakdown,
      scoreDistribution,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
