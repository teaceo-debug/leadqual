import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Users, Flame, Target, BarChart3, Brain, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeDate, getLabelColor } from '@/lib/utils'
import { getModelStats } from '@/lib/learn'
import { ModelMetricsCard } from '@/components/dashboard/model-metrics-card'
import { LeadTrendsChart } from '@/components/dashboard/lead-trends-chart'
import { IndustryBreakdownChart, CompanySizeChart, ScoreDistributionChart } from '@/components/dashboard/analytics-charts'

async function getAnalytics(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) {
  // First verify we have an authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get user's organization - filter by user_id for explicit query
  const { data: member, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !member) return null

  const orgId = member.organization_id
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // Get current period stats
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Get previous period stats for comparison
  const { count: prevLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString())

  // Hot leads current period
  const { count: hotLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('label', 'hot')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Converted leads
  const { count: convertedLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'converted')

  // All leads for avg score
  const { data: allLeads } = await supabase
    .from('leads')
    .select('score')
    .eq('organization_id', orgId)
    .not('score', 'is', null)

  const avgScore = allLeads && allLeads.length > 0
    ? Math.round(allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / allLeads.length)
    : 0

  // Recent hot leads
  const { data: recentHotLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', orgId)
    .eq('label', 'hot')
    .order('created_at', { ascending: false })
    .limit(5)

  const leadsChange = prevLeads && prevLeads > 0
    ? Math.round(((totalLeads || 0) - prevLeads) / prevLeads * 100)
    : 0

  const conversionRate = totalLeads && totalLeads > 0
    ? Math.round((convertedLeads || 0) / totalLeads * 100)
    : 0

  // Get ML model stats
  const modelStats = await getModelStats(orgId)

  // Get conversion rate by score range
  const { data: allLeadsWithScores } = await supabase
    .from('leads')
    .select('score, status')
    .eq('organization_id', orgId)
    .not('score', 'is', null)

  const scoreRanges = [
    { label: '80-100 (Hot)', min: 80, max: 100 },
    { label: '50-79 (Warm)', min: 50, max: 79 },
    { label: '0-49 (Cold)', min: 0, max: 49 },
  ]

  const conversionByScore = scoreRanges.map(range => {
    const leadsInRange = (allLeadsWithScores || []).filter(
      l => l.score !== null && l.score >= range.min && l.score <= range.max
    )
    const convertedInRange = leadsInRange.filter(l => l.status === 'converted')
    return {
      range: range.label,
      total: leadsInRange.length,
      converted: convertedInRange.length,
      rate: leadsInRange.length > 0 ? Math.round((convertedInRange.length / leadsInRange.length) * 100) : 0,
    }
  })

  return {
    totalLeads: totalLeads || 0,
    leadsChange,
    hotLeads: hotLeads || 0,
    conversionRate,
    avgScore,
    recentHotLeads: recentHotLeads || [],
    modelStats,
    conversionByScore,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const analytics = await getAnalytics(supabase)

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No organization found. Please contact support.</p>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Leads',
      value: analytics.totalLeads,
      change: analytics.leadsChange,
      icon: Users,
    },
    {
      name: 'Hot Leads',
      value: analytics.hotLeads,
      icon: Flame,
      highlight: true,
    },
    {
      name: 'Conversion Rate',
      value: `${analytics.conversionRate}%`,
      icon: Target,
    },
    {
      name: 'Avg Score',
      value: analytics.avgScore,
      icon: BarChart3,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your lead qualification metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.highlight ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change !== undefined && (
                <p className={`text-xs flex items-center gap-1 ${
                  stat.change >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {stat.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change >= 0 ? '+' : ''}{stat.change}% from last month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead Trends Chart */}
      <LeadTrendsChart />

      {/* Analytics Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <IndustryBreakdownChart />
        <CompanySizeChart />
        <ScoreDistributionChart />
      </div>

      {/* Recent Hot Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Hot Leads</CardTitle>
          <Link
            href="/dashboard/leads?label=hot"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {analytics.recentHotLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hot leads yet. They&apos;ll appear here when they come in.
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.recentHotLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads?selected=${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {(lead.first_name?.[0] || lead.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lead.company_name || lead.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getLabelColor('hot')}>
                      Score: {lead.score}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeDate(lead.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ML Model Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ML Model Status
            </CardTitle>
            <CardDescription>
              Scoring model performance and training status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelMetricsCard
              modelStats={analytics.modelStats}
            />
          </CardContent>
        </Card>

        {/* Conversion by Score Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion by Score
            </CardTitle>
            <CardDescription>
              How well scores predict actual conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.conversionByScore.map((range) => (
                <div key={range.range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{range.range}</span>
                    <span className="text-muted-foreground">
                      {range.converted}/{range.total} ({range.rate}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${range.rate}%` }}
                    />
                  </div>
                </div>
              ))}
              {analytics.conversionByScore.every(r => r.total === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scored leads yet. Conversion data will appear after leads are qualified.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Outcome Distribution
          </CardTitle>
          <CardDescription>
            Track outcomes to improve ML model accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{analytics.modelStats.outcomeBreakdown.converted}</p>
              <p className="text-sm text-muted-foreground">Converted</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{analytics.modelStats.outcomeBreakdown.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{analytics.modelStats.outcomeBreakdown.no_response}</p>
              <p className="text-sm text-muted-foreground">No Response</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
              <Target className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">{analytics.modelStats.outcomeBreakdown.qualified_out}</p>
              <p className="text-sm text-muted-foreground">Qualified Out</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{analytics.modelStats.outcomeBreakdown.in_progress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Total outcomes recorded: {analytics.modelStats.totalOutcomes}
              {analytics.modelStats.totalOutcomes < 50 && (
                <span className="block text-xs mt-1">
                  Record {50 - analytics.modelStats.totalOutcomes} more to enable ML model training
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
