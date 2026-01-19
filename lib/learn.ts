import { createAdminClient } from '@/lib/supabase/admin'
import {
  FeatureVector,
  DEFAULT_FEATURE_WEIGHTS,
  deserializeFeatures,
  calculateWeightedScore,
  getScoreLabel,
} from '@/lib/features'

/**
 * Outcome types for learning
 */
export type OutcomeType = 'converted' | 'rejected' | 'no_response' | 'qualified_out' | 'in_progress'

/**
 * Training data point
 */
interface TrainingExample {
  features: FeatureVector
  outcome: OutcomeType
  outcomeValue: number | null // For converted: deal value
  daysToOutcome: number | null
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  auc: number
  confusionMatrix: {
    truePositives: number
    falsePositives: number
    trueNegatives: number
    falseNegatives: number
  }
  featureImportance: Record<string, number>
}

/**
 * Scoring model with weights and metadata
 */
export interface ScoringModel {
  id: string
  organizationId: string
  modelVersion: number
  featureWeights: FeatureVector
  performanceMetrics: ModelMetrics | null
  trainedOnCount: number
  isActive: boolean
  createdAt: string
}

/**
 * Get the active scoring model for an organization
 */
export async function getActiveScoringModel(organizationId: string): Promise<ScoringModel | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('scoring_models')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    modelVersion: data.model_version,
    featureWeights: deserializeFeatures(data.feature_weights),
    performanceMetrics: data.performance_metrics as ModelMetrics | null,
    trainedOnCount: data.trained_on_count,
    isActive: data.is_active,
    createdAt: data.created_at,
  }
}

/**
 * Get training data for an organization
 */
async function getTrainingData(organizationId: string): Promise<TrainingExample[]> {
  const supabase = createAdminClient()

  // Get all leads with outcomes and scoring history
  const { data: outcomes, error: outcomesError } = await supabase
    .from('lead_outcomes')
    .select(`
      *,
      lead:leads!inner(
        id,
        organization_id
      )
    `)
    .eq('lead.organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (outcomesError || !outcomes) {
    return []
  }

  // Get feature vectors from scoring history
  const leadIds = outcomes.map(o => o.lead_id)
  const { data: scoringHistory } = await supabase
    .from('scoring_history')
    .select('*')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })

  // Build lookup for latest feature vector per lead
  const featuresByLead: Record<string, FeatureVector> = {}
  if (scoringHistory) {
    for (const sh of scoringHistory) {
      if (!featuresByLead[sh.lead_id] && sh.feature_vector) {
        featuresByLead[sh.lead_id] = deserializeFeatures(sh.feature_vector)
      }
    }
  }

  // Build training examples
  const examples: TrainingExample[] = []
  for (const outcome of outcomes) {
    const features = featuresByLead[outcome.lead_id]
    if (features) {
      examples.push({
        features,
        outcome: outcome.outcome_type as OutcomeType,
        outcomeValue: outcome.outcome_value,
        daysToOutcome: outcome.days_to_outcome,
      })
    }
  }

  return examples
}

/**
 * Calculate feature importance based on correlation with positive outcomes
 */
export function calculateFeatureImportance(examples: TrainingExample[]): Record<keyof FeatureVector, number> {
  const featureKeys = Object.keys(DEFAULT_FEATURE_WEIGHTS) as Array<keyof FeatureVector>
  const importance: Record<string, number> = {}

  // Separate positive (converted) and negative (rejected, no_response) outcomes
  const positiveExamples = examples.filter(e => e.outcome === 'converted')
  const negativeExamples = examples.filter(e => e.outcome === 'rejected' || e.outcome === 'no_response')

  if (positiveExamples.length === 0 || negativeExamples.length === 0) {
    // Not enough data, return default weights
    return { ...DEFAULT_FEATURE_WEIGHTS }
  }

  // Calculate average feature values for positive and negative outcomes
  for (const key of featureKeys) {
    const posAvg = positiveExamples.reduce((sum, e) => sum + e.features[key], 0) / positiveExamples.length
    const negAvg = negativeExamples.reduce((sum, e) => sum + e.features[key], 0) / negativeExamples.length

    // Importance is the difference in averages (normalized)
    // Higher values in positive examples = more important
    const diff = posAvg - negAvg
    importance[key] = Math.max(0, diff + 0.5) // Shift to positive range
  }

  // Normalize importance to sum to 1
  const total = Object.values(importance).reduce((sum, v) => sum + v, 0)
  for (const key of featureKeys) {
    importance[key] = total > 0 ? importance[key] / total : DEFAULT_FEATURE_WEIGHTS[key]
  }

  return importance as Record<keyof FeatureVector, number>
}

/**
 * Adjust feature weights based on outcomes using gradient-like updates
 */
export function adjustWeights(
  currentWeights: FeatureVector,
  examples: TrainingExample[],
  learningRate = 0.1
): FeatureVector {
  const featureKeys = Object.keys(currentWeights) as Array<keyof FeatureVector>
  const newWeights = { ...currentWeights }

  // Calculate gradients based on prediction errors
  for (const key of featureKeys) {
    let gradient = 0

    for (const example of examples) {
      // Calculate predicted score with current weights
      const predictedScore = calculateWeightedScore(example.features, currentWeights)
      const predictedLabel = getScoreLabel(predictedScore)

      // Target score based on outcome
      const targetScore =
        example.outcome === 'converted' ? 85 :
        example.outcome === 'rejected' ? 30 :
        example.outcome === 'no_response' ? 40 :
        50

      // Error signal
      const error = targetScore - predictedScore

      // Gradient: how much this feature contributed to the error
      gradient += error * example.features[key]
    }

    // Average gradient
    gradient /= examples.length

    // Update weight
    newWeights[key] = Math.max(0.01, Math.min(0.5, currentWeights[key] + learningRate * gradient * 0.01))
  }

  // Normalize weights to sum to 1
  const total = Object.values(newWeights).reduce((sum, v) => sum + v, 0)
  for (const key of featureKeys) {
    newWeights[key] = newWeights[key] / total
  }

  return newWeights
}

/**
 * Validate model performance using holdout data
 */
export function validateModel(
  weights: FeatureVector,
  testExamples: TrainingExample[]
): ModelMetrics {
  let truePositives = 0
  let falsePositives = 0
  let trueNegatives = 0
  let falseNegatives = 0

  for (const example of testExamples) {
    const predictedScore = calculateWeightedScore(example.features, weights)
    const predictedPositive = predictedScore >= 70 // Threshold for "likely to convert"
    const actualPositive = example.outcome === 'converted'

    if (predictedPositive && actualPositive) truePositives++
    else if (predictedPositive && !actualPositive) falsePositives++
    else if (!predictedPositive && !actualPositive) trueNegatives++
    else falseNegatives++
  }

  const total = testExamples.length
  const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0
  const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0
  const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0
  const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0

  // Simple AUC approximation
  const auc = (recall + (trueNegatives / (trueNegatives + falsePositives || 1))) / 2

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    auc,
    confusionMatrix: {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
    },
    featureImportance: calculateFeatureImportance(testExamples),
  }
}

/**
 * Main retraining function - updates the scoring model for an organization
 */
export async function updateScoringModel(organizationId: string): Promise<{
  success: boolean
  model?: ScoringModel
  error?: string
}> {
  const supabase = createAdminClient()

  try {
    // Get training data
    const examples = await getTrainingData(organizationId)

    if (examples.length < 50) {
      return {
        success: false,
        error: `Insufficient training data. Need at least 50 outcomes, have ${examples.length}.`,
      }
    }

    // Split into train (80%) and test (20%)
    const shuffled = [...examples].sort(() => Math.random() - 0.5)
    const splitIdx = Math.floor(shuffled.length * 0.8)
    const trainExamples = shuffled.slice(0, splitIdx)
    const testExamples = shuffled.slice(splitIdx)

    // Get current model or use defaults
    const currentModel = await getActiveScoringModel(organizationId)
    const currentWeights = currentModel?.featureWeights || DEFAULT_FEATURE_WEIGHTS

    // Train new weights
    let newWeights = adjustWeights(currentWeights, trainExamples)

    // Multiple training iterations for convergence
    for (let i = 0; i < 10; i++) {
      newWeights = adjustWeights(newWeights, trainExamples, 0.1 / (i + 1))
    }

    // Validate on test set
    const metrics = validateModel(newWeights, testExamples)

    // Only save if model performs reasonably well
    if (metrics.accuracy < 0.5 && currentModel) {
      return {
        success: false,
        error: `New model accuracy (${(metrics.accuracy * 100).toFixed(1)}%) is too low. Keeping current model.`,
      }
    }

    // Determine new model version
    const newVersion = (currentModel?.modelVersion || 0) + 1

    // Deactivate current active model
    if (currentModel) {
      await supabase
        .from('scoring_models')
        .update({ is_active: false })
        .eq('id', currentModel.id)
    }

    // Save new model
    const { data: newModel, error: insertError } = await supabase
      .from('scoring_models')
      .insert({
        organization_id: organizationId,
        model_version: newVersion,
        feature_weights: newWeights,
        performance_metrics: metrics,
        trained_on_count: examples.length,
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !newModel) {
      return {
        success: false,
        error: `Failed to save model: ${insertError?.message || 'Unknown error'}`,
      }
    }

    return {
      success: true,
      model: {
        id: newModel.id,
        organizationId: newModel.organization_id,
        modelVersion: newModel.model_version,
        featureWeights: deserializeFeatures(newModel.feature_weights),
        performanceMetrics: newModel.performance_metrics as ModelMetrics,
        trainedOnCount: newModel.trained_on_count,
        isActive: newModel.is_active,
        createdAt: newModel.created_at,
      },
    }
  } catch (error) {
    console.error('Model training failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during training',
    }
  }
}

/**
 * Check if an organization should retrain their model
 */
export async function shouldRetrainModel(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('should_retrain_model', {
    org_id: organizationId,
  })

  if (error) {
    console.error('Error checking retrain status:', error)
    return false
  }

  return data === true
}

/**
 * Get model training stats for dashboard
 */
export async function getModelStats(organizationId: string): Promise<{
  currentModel: ScoringModel | null
  totalOutcomes: number
  outcomeBreakdown: Record<OutcomeType, number>
  retrainingRecommended: boolean
}> {
  const supabase = createAdminClient()

  const [model, shouldRetrain] = await Promise.all([
    getActiveScoringModel(organizationId),
    shouldRetrainModel(organizationId),
  ])

  // Get outcome counts
  const { data: outcomes } = await supabase
    .from('lead_outcomes')
    .select(`
      outcome_type,
      lead:leads!inner(organization_id)
    `)
    .eq('lead.organization_id', organizationId)

  const outcomeBreakdown: Record<OutcomeType, number> = {
    converted: 0,
    rejected: 0,
    no_response: 0,
    qualified_out: 0,
    in_progress: 0,
  }

  let totalOutcomes = 0
  if (outcomes) {
    for (const o of outcomes) {
      const type = o.outcome_type as OutcomeType
      outcomeBreakdown[type] = (outcomeBreakdown[type] || 0) + 1
      totalOutcomes++
    }
  }

  return {
    currentModel: model,
    totalOutcomes,
    outcomeBreakdown,
    retrainingRecommended: shouldRetrain,
  }
}
