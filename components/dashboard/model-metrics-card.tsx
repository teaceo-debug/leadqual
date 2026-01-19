'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, AlertCircle, CheckCircle2, Brain } from 'lucide-react'
import type { ScoringModel, ModelMetrics } from '@/lib/learn'

interface ModelStatsData {
  currentModel: ScoringModel | null
  totalOutcomes: number
  outcomeBreakdown: Record<string, number>
  retrainingRecommended: boolean
}

interface ModelMetricsCardProps {
  modelStats: ModelStatsData
}

export function ModelMetricsCard({ modelStats }: ModelMetricsCardProps) {
  const [retraining, setRetraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRetrain = async () => {
    setRetraining(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/scoring/retrain', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrain model')
      }

      setSuccess(true)
      // Refresh the page after 2 seconds to show new model
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setRetraining(false)
    }
  }

  const { currentModel, totalOutcomes, retrainingRecommended } = modelStats
  const metrics = currentModel?.performanceMetrics

  if (!currentModel) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>No trained model yet</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Record outcomes for at least 50 leads to enable ML model training.
          Current progress: {totalOutcomes}/50 outcomes.
        </p>
        <Progress value={(totalOutcomes / 50) * 100} className="h-2" />

        {totalOutcomes >= 50 && (
          <Button onClick={handleRetrain} disabled={retraining} className="w-full">
            {retraining ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Training Model...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Train First Model
              </>
            )}
          </Button>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-medium">Model v{currentModel.modelVersion}</span>
        </div>
        <Badge variant={currentModel.isActive ? 'default' : 'secondary'}>
          {currentModel.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground">
        Trained on {currentModel.trainedOnCount} outcomes
      </div>

      {metrics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Accuracy</span>
              <p className="text-lg font-semibold">{(metrics.accuracy * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Precision</span>
              <p className="text-lg font-semibold">{(metrics.precision * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Recall</span>
              <p className="text-lg font-semibold">{(metrics.recall * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">F1 Score</span>
              <p className="text-lg font-semibold">{(metrics.f1Score * 100).toFixed(1)}%</p>
            </div>
          </div>

          {metrics.featureImportance && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Top Features</span>
              <div className="space-y-1">
                {Object.entries(metrics.featureImportance)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([feature, importance]) => (
                    <div key={feature} className="flex items-center gap-2">
                      <div className="flex-1 text-xs truncate">{formatFeatureName(feature)}</div>
                      <div className="w-20">
                        <Progress value={importance * 100} className="h-1.5" />
                      </div>
                      <div className="text-xs text-muted-foreground w-10 text-right">
                        {(importance * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {retrainingRecommended && (
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            50+ new outcomes recorded. Retraining recommended.
          </p>
        </div>
      )}

      <Button
        onClick={handleRetrain}
        disabled={retraining}
        variant={retrainingRecommended ? 'default' : 'outline'}
        className="w-full"
      >
        {retraining ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Training...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retrain Model
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600">Model trained successfully! Refreshing...</p>
      )}
    </div>
  )
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
