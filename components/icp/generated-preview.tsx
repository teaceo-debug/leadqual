'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { ICPGenerationResult, GeneratedCriterion } from '@/lib/icp-generator'

interface GeneratedPreviewProps {
  result: ICPGenerationResult & { generation_id?: string }
  onApply: () => void
  onRegenerate: () => void
  applying: boolean
}

const CRITERION_ICONS: Record<string, string> = {
  company_size: 'Building',
  industry: 'Briefcase',
  budget: 'DollarSign',
  timeline: 'Calendar',
  job_title: 'User',
}

const CRITERION_COLORS: Record<string, string> = {
  company_size: 'bg-blue-500',
  industry: 'bg-green-500',
  budget: 'bg-amber-500',
  timeline: 'bg-purple-500',
  job_title: 'bg-rose-500',
}

export function GeneratedPreview({
  result,
  onApply,
  onRegenerate,
  applying: externalApplying,
}: GeneratedPreviewProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({})
  const [editedCriteria, setEditedCriteria] = useState<GeneratedCriterion[]>(result.criteria)
  const [error, setError] = useState<string | null>(null)
  const [internalApplying, setInternalApplying] = useState(false)

  const applying = externalApplying || internalApplying

  const toggleExpanded = (name: string) => {
    setExpandedCriteria((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  const updateWeight = (index: number, newWeight: number) => {
    setEditedCriteria((prev) => {
      const oldWeight = prev[index].weight
      const diff = newWeight - oldWeight

      // Create new array with cloned objects
      const updated = prev.map((c, i) => {
        if (i === index) {
          return { ...c, weight: newWeight }
        }

        // Adjust other weights proportionally
        const othersTotal = 100 - oldWeight
        if (othersTotal > 0 && diff !== 0) {
          const proportion = c.weight / othersTotal
          return { ...c, weight: Math.max(5, Math.round(c.weight - diff * proportion)) }
        }

        return { ...c }
      })

      // Normalize to ensure sum is 100
      const total = updated.reduce((sum, c) => sum + c.weight, 0)
      if (total !== 100) {
        const adjustment = 100 - total
        // Add adjustment to the largest weight that isn't the current one
        const sortedIndices = updated
          .map((c, i) => ({ weight: c.weight, index: i }))
          .filter((c) => c.index !== index)
          .sort((a, b) => b.weight - a.weight)

        if (sortedIndices.length > 0) {
          return updated.map((c, i) =>
            i === sortedIndices[0].index ? { ...c, weight: c.weight + adjustment } : c
          )
        }
      }

      return updated
    })
  }

  const handleApply = async () => {
    if (!result.generation_id) {
      setError('No generation ID found. Please regenerate.')
      return
    }

    setError(null)
    setInternalApplying(true)

    try {
      const response = await fetch(`/api/icp/generate/${result.generation_id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace: true,
          criteria: editedCriteria,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply criteria')
      }

      onApply()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply criteria')
    } finally {
      setInternalApplying(false)
    }
  }

  const totalWeight = editedCriteria.reduce((sum, c) => sum + c.weight, 0)

  return (
    <div className="space-y-6">
      {result.company && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{result.company.name}</h3>
                <p className="text-sm text-muted-foreground">{result.company.description}</p>
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Target market:</span>{' '}
                  {result.company.target_market}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generated ICP Criteria
          </h3>
          <p className="text-sm text-muted-foreground">
            {editedCriteria.length} criteria with {result.confidence}% confidence
          </p>
        </div>
        <Badge variant={result.confidence >= 80 ? 'default' : 'secondary'}>
          {result.confidence}% confidence
        </Badge>
      </div>

      <div className="space-y-3">
        {editedCriteria.map((criterion, index) => (
          <Card key={criterion.name} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleExpanded(criterion.name)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${CRITERION_COLORS[criterion.type] || 'bg-gray-500'}`}
                />
                <div>
                  <p className="font-medium">{criterion.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {criterion.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold">{criterion.weight}%</p>
                  <p className="text-xs text-muted-foreground">weight</p>
                </div>
                {expandedCriteria[criterion.name] ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {expandedCriteria[criterion.name] && (
              <>
                <Separator />
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Ideal Values</p>
                    <div className="flex flex-wrap gap-2">
                      {criterion.ideal_values.map((value) => (
                        <Badge key={value} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {criterion.reasoning && (
                    <div>
                      <p className="text-sm font-medium mb-1">Reasoning</p>
                      <p className="text-sm text-muted-foreground">{criterion.reasoning}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Adjust Weight</p>
                      <span className="text-sm font-medium">{criterion.weight}%</span>
                    </div>
                    <Slider
                      value={[criterion.weight]}
                      onValueChange={(v) => updateWeight(index, v[0])}
                      min={5}
                      max={50}
                      step={5}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {totalWeight !== 100 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Weights sum to {totalWeight}%, will be normalized to 100%
            </p>
          </CardContent>
        </Card>
      )}

      {result.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.summary}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onRegenerate} disabled={applying} className="flex-1">
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
        <Button onClick={handleApply} disabled={applying} className="flex-1">
          {applying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Apply to ICP
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        This will replace your existing ICP criteria with the generated ones.
      </p>
    </div>
  )
}
