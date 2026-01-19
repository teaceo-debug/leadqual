'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Brain,
  TrendingUp,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Target,
  Zap,
} from 'lucide-react'

interface CompanyResearch {
  company_size_estimate: string | null
  technology_indicators: string[]
  growth_signals: string[]
  pain_points: string[]
  health_score: number
  confidence: number
  summary: string
}

interface IntentAnalysis {
  problem_awareness: number
  solution_awareness: number
  urgency_indicators: string[]
  authority_to_purchase: number
  buying_intent_score: number
  urgency_score: number
  summary: string
}

interface AuthorityAssessment {
  decision_maker_likelihood: number
  title_seniority: string
  buying_role: string
  authority_level: number
}

interface EnrichmentData {
  company_research?: {
    data: CompanyResearch
    confidence: number | null
    source: string
    created_at: string
  }
  intent_analysis?: {
    data: IntentAnalysis
    confidence: number | null
    source: string
    created_at: string
  }
  authority_assessment?: {
    data: AuthorityAssessment
    confidence: number | null
    source: string
    created_at: string
  }
}

interface LeadEnrichmentsProps {
  leadId: string
}

export function LeadEnrichments({ leadId }: LeadEnrichmentsProps) {
  const [enrichments, setEnrichments] = useState<EnrichmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEnrichments = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/enrichments`)
      if (!response.ok) {
        throw new Error('Failed to fetch enrichments')
      }
      const data = await response.json()
      setEnrichments(data.enrichments || {})
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/leads/${leadId}/enrichments`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to refresh enrichments')
      }
      await fetchEnrichments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEnrichments()
  }, [leadId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    )
  }

  const hasEnrichments = enrichments && (
    enrichments.company_research ||
    enrichments.intent_analysis ||
    enrichments.authority_assessment
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Insights
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!hasEnrichments ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No enrichment data yet. Click Refresh to analyze this lead.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Company Research */}
          {enrichments?.company_research?.data && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Company Research</span>
                {enrichments.company_research.data.health_score && (
                  <Badge variant="outline" className="ml-auto">
                    Health: {enrichments.company_research.data.health_score}/10
                  </Badge>
                )}
              </div>

              {enrichments.company_research.data.summary && (
                <p className="text-sm text-muted-foreground">
                  {enrichments.company_research.data.summary}
                </p>
              )}

              {enrichments.company_research.data.company_size_estimate && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Size estimate:</span>{' '}
                  {enrichments.company_research.data.company_size_estimate}
                </div>
              )}

              {enrichments.company_research.data.growth_signals?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Growth Signals:</span>
                  <div className="flex flex-wrap gap-1">
                    {enrichments.company_research.data.growth_signals.map((signal, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {enrichments.company_research.data.pain_points?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Pain Points:</span>
                  <div className="flex flex-wrap gap-1">
                    {enrichments.company_research.data.pain_points.map((pain, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {pain}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Intent Analysis */}
          {enrichments?.intent_analysis?.data && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">Intent Analysis</span>
                <Badge variant="outline" className="ml-auto">
                  Intent: {enrichments.intent_analysis.data.buying_intent_score}/100
                </Badge>
              </div>

              {enrichments.intent_analysis.data.summary && (
                <p className="text-sm text-muted-foreground">
                  {enrichments.intent_analysis.data.summary}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Problem Awareness:</span>{' '}
                  <ScoreIndicator value={enrichments.intent_analysis.data.problem_awareness} max={5} />
                </div>
                <div>
                  <span className="text-muted-foreground">Solution Awareness:</span>{' '}
                  <ScoreIndicator value={enrichments.intent_analysis.data.solution_awareness} max={5} />
                </div>
                <div>
                  <span className="text-muted-foreground">Authority:</span>{' '}
                  <ScoreIndicator value={enrichments.intent_analysis.data.authority_to_purchase} max={5} />
                </div>
                <div>
                  <span className="text-muted-foreground">Urgency:</span>{' '}
                  <ScoreIndicator value={Math.round(enrichments.intent_analysis.data.urgency_score * 5)} max={5} />
                </div>
              </div>

              {enrichments.intent_analysis.data.urgency_indicators?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Urgency Indicators:</span>
                  <div className="flex flex-wrap gap-1">
                    {enrichments.intent_analysis.data.urgency_indicators.map((indicator, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Authority Assessment */}
          {enrichments?.authority_assessment?.data && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Authority Assessment</span>
                <Badge variant="outline" className="ml-auto capitalize">
                  {enrichments.authority_assessment.data.buying_role || 'Unknown'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Seniority:</span>{' '}
                  <span className="capitalize">{enrichments.authority_assessment.data.title_seniority || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Decision Maker:</span>{' '}
                  {Math.round((enrichments.authority_assessment.data.decision_maker_likelihood || 0) * 100)}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreIndicator({ value, max }: { value: number; max: number }) {
  const percentage = (value / max) * 100
  const color = percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <span className={`font-medium ${color}`}>
      {value}/{max}
    </span>
  )
}
