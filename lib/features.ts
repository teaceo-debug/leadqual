import type { Lead, ICPCriterion } from '@/types'

/**
 * Feature vector for ML-based lead scoring
 * All features are normalized to 0-1 scale
 */
export interface FeatureVector {
  // ICP alignment features (from criteria matching)
  company_size_match: number
  industry_match: number
  budget_match: number
  timeline_match: number
  job_title_match: number

  // AI-derived features (from enrichment)
  buying_intent_score: number
  authority_level: number
  company_health_score: number
  urgency_indicators: number

  // Data quality features
  data_completeness: number
  contact_quality: number
}

/**
 * Default feature weights for initial scoring
 * These are overridden by learned weights when available
 */
export const DEFAULT_FEATURE_WEIGHTS: FeatureVector = {
  company_size_match: 0.10,
  industry_match: 0.08,
  budget_match: 0.15,
  timeline_match: 0.10,
  job_title_match: 0.08,
  buying_intent_score: 0.15,
  authority_level: 0.12,
  company_health_score: 0.08,
  urgency_indicators: 0.10,
  data_completeness: 0.02,
  contact_quality: 0.02,
}

/**
 * Extract feature vector from lead data and ICP criteria
 */
export function extractFeatures(
  lead: Lead,
  criteria: ICPCriterion[],
  enrichments?: {
    intent?: { buying_intent_score?: number; urgency_score?: number }
    authority?: { authority_level?: number }
    company?: { health_score?: number }
  }
): FeatureVector {
  // Build criteria lookup by type/name
  const criteriaByType: Record<string, ICPCriterion> = {}
  for (const c of criteria) {
    const key = c.name.toLowerCase().replace(/[^a-z_]/g, '_')
    criteriaByType[key] = c
  }

  return {
    // ICP alignment features
    company_size_match: calculateCriterionMatch(
      lead.company_size,
      findCriterion(criteriaByType, ['company_size', 'size', 'employees'])
    ),
    industry_match: calculateCriterionMatch(
      lead.industry,
      findCriterion(criteriaByType, ['industry', 'vertical', 'sector'])
    ),
    budget_match: calculateBudgetMatch(
      lead.budget_range,
      findCriterion(criteriaByType, ['budget', 'budget_range', 'price'])
    ),
    timeline_match: calculateTimelineMatch(
      lead.timeline,
      findCriterion(criteriaByType, ['timeline', 'timeframe', 'urgency'])
    ),
    job_title_match: calculateTitleMatch(
      lead.job_title,
      findCriterion(criteriaByType, ['job_title', 'title', 'role', 'position'])
    ),

    // AI-derived features (from enrichment, default to 0.5 if not available)
    buying_intent_score: normalizeScore(enrichments?.intent?.buying_intent_score, 0.5),
    authority_level: normalizeScore(enrichments?.authority?.authority_level, 0.5),
    company_health_score: normalizeScore(enrichments?.company?.health_score, 0.5),
    urgency_indicators: normalizeScore(enrichments?.intent?.urgency_score, 0.5),

    // Data quality features
    data_completeness: calculateDataCompleteness(lead),
    contact_quality: calculateContactQuality(lead),
  }
}

/**
 * Calculate weighted score from feature vector
 */
export function calculateWeightedScore(
  features: FeatureVector,
  weights: FeatureVector = DEFAULT_FEATURE_WEIGHTS
): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const key of Object.keys(features) as Array<keyof FeatureVector>) {
    const featureValue = features[key]
    const weight = weights[key] || 0
    weightedSum += featureValue * weight
    totalWeight += weight
  }

  // Normalize to 0-100 scale
  const normalizedScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 50
  return Math.round(Math.min(100, Math.max(0, normalizedScore)))
}

/**
 * Get score label from numeric score
 */
export function getScoreLabel(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 80) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}

/**
 * Find a criterion by possible names
 */
function findCriterion(
  criteriaByType: Record<string, ICPCriterion>,
  possibleNames: string[]
): ICPCriterion | undefined {
  for (const name of possibleNames) {
    if (criteriaByType[name]) {
      return criteriaByType[name]
    }
  }
  return undefined
}

/**
 * Calculate match score for a criterion value
 */
function calculateCriterionMatch(
  value: string | null,
  criterion?: ICPCriterion
): number {
  if (!value || !criterion) return 0.5 // Neutral if no data

  const idealValues = criterion.ideal_values || []
  if (idealValues.length === 0) return 0.6 // Slightly positive if data exists but no ideals

  const normalizedValue = value.toLowerCase().trim()

  // Check for exact match
  for (const ideal of idealValues) {
    if (normalizedValue === ideal.toLowerCase().trim()) {
      return 1.0
    }
  }

  // Check for partial match
  for (const ideal of idealValues) {
    const normalizedIdeal = ideal.toLowerCase().trim()
    if (normalizedValue.includes(normalizedIdeal) || normalizedIdeal.includes(normalizedValue)) {
      return 0.8
    }
  }

  return 0.3 // No match
}

/**
 * Calculate budget match with range awareness
 */
function calculateBudgetMatch(
  budget: string | null,
  criterion?: ICPCriterion
): number {
  if (!budget) return 0.4

  const idealValues = criterion?.ideal_values || []
  if (idealValues.length === 0) return 0.6

  // Extract numeric value from budget string
  const budgetNum = extractNumericValue(budget)
  if (budgetNum === null) {
    // Fall back to string matching
    return calculateCriterionMatch(budget, criterion)
  }

  // Check against ideal budget ranges
  for (const ideal of idealValues) {
    const idealNum = extractNumericValue(ideal)
    if (idealNum !== null) {
      // Within 50% of ideal is a good match
      const ratio = budgetNum / idealNum
      if (ratio >= 0.5 && ratio <= 2.0) {
        return Math.max(0.6, 1 - Math.abs(1 - ratio) * 0.5)
      }
    }
  }

  // Check for budget tier keywords
  const budgetLower = budget.toLowerCase()
  const highBudgetKeywords = ['enterprise', '100k+', '50k+', 'unlimited', 'flexible']
  const midBudgetKeywords = ['10k', '25k', 'growth', 'standard']
  const lowBudgetKeywords = ['startup', 'small', 'limited', 'under 5k', 'minimal']

  if (highBudgetKeywords.some(k => budgetLower.includes(k))) return 0.9
  if (midBudgetKeywords.some(k => budgetLower.includes(k))) return 0.7
  if (lowBudgetKeywords.some(k => budgetLower.includes(k))) return 0.4

  return 0.5
}

/**
 * Calculate timeline match with urgency consideration
 */
function calculateTimelineMatch(
  timeline: string | null,
  criterion?: ICPCriterion
): number {
  if (!timeline) return 0.4

  const timelineLower = timeline.toLowerCase()

  // Urgency keywords mapping
  const urgentKeywords = ['immediately', 'asap', 'urgent', 'this week', 'next week', '1 week', 'today']
  const soonKeywords = ['this month', '1 month', '30 days', 'next month', '2-4 weeks']
  const mediumKeywords = ['this quarter', '3 months', '90 days', '2-3 months', 'q1', 'q2', 'q3', 'q4']
  const laterKeywords = ['6 months', 'next year', 'evaluating', 'researching', 'not sure', 'eventually']

  if (urgentKeywords.some(k => timelineLower.includes(k))) return 1.0
  if (soonKeywords.some(k => timelineLower.includes(k))) return 0.85
  if (mediumKeywords.some(k => timelineLower.includes(k))) return 0.65
  if (laterKeywords.some(k => timelineLower.includes(k))) return 0.35

  // Fall back to criterion matching
  return calculateCriterionMatch(timeline, criterion)
}

/**
 * Calculate job title match with seniority awareness
 */
function calculateTitleMatch(
  title: string | null,
  criterion?: ICPCriterion
): number {
  if (!title) return 0.4

  const titleLower = title.toLowerCase()

  // Decision-maker titles
  const executiveKeywords = ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'chief', 'president', 'owner', 'founder', 'partner']
  const vpKeywords = ['vp', 'vice president', 'svp', 'evp', 'head of']
  const directorKeywords = ['director', 'senior director', 'managing director']
  const managerKeywords = ['manager', 'lead', 'senior', 'principal']
  const icKeywords = ['analyst', 'associate', 'coordinator', 'specialist', 'assistant', 'intern']

  // Score based on seniority
  if (executiveKeywords.some(k => titleLower.includes(k))) return 1.0
  if (vpKeywords.some(k => titleLower.includes(k))) return 0.9
  if (directorKeywords.some(k => titleLower.includes(k))) return 0.8
  if (managerKeywords.some(k => titleLower.includes(k))) return 0.65

  // Individual contributors typically have less buying power
  if (icKeywords.some(k => titleLower.includes(k))) return 0.35

  // Fall back to criterion matching if available
  if (criterion) {
    return calculateCriterionMatch(title, criterion)
  }

  return 0.5
}

/**
 * Calculate data completeness score
 */
function calculateDataCompleteness(lead: Lead): number {
  const fields = [
    { value: lead.email, weight: 0.15 },
    { value: lead.first_name, weight: 0.10 },
    { value: lead.last_name, weight: 0.10 },
    { value: lead.phone, weight: 0.10 },
    { value: lead.job_title, weight: 0.15 },
    { value: lead.company_name, weight: 0.15 },
    { value: lead.company_website, weight: 0.05 },
    { value: lead.company_size, weight: 0.05 },
    { value: lead.industry, weight: 0.05 },
    { value: lead.budget_range, weight: 0.05 },
    { value: lead.timeline, weight: 0.03 },
    { value: lead.challenge, weight: 0.02 },
  ]

  let completeness = 0
  for (const field of fields) {
    if (field.value && field.value.trim() !== '') {
      completeness += field.weight
    }
  }

  return Math.min(1, completeness)
}

/**
 * Calculate contact quality score
 */
function calculateContactQuality(lead: Lead): number {
  let score = 0.5

  // Email quality
  if (lead.email) {
    const email = lead.email.toLowerCase()
    // Business email domains are higher quality
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com']
    const isPersonal = personalDomains.some(d => email.endsWith(d))
    score += isPersonal ? 0.1 : 0.25
  }

  // Phone provided
  if (lead.phone) {
    score += 0.15
  }

  // Company website provided (validates business)
  if (lead.company_website) {
    score += 0.1
  }

  return Math.min(1, score)
}

/**
 * Extract numeric value from string (e.g., "$10,000" -> 10000)
 */
function extractNumericValue(str: string): number | null {
  const cleaned = str.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Normalize a score to 0-1 range
 */
function normalizeScore(value: number | undefined, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue
  // Handle both 0-1 and 0-100 scales
  if (value > 1) {
    return Math.min(1, Math.max(0, value / 100))
  }
  return Math.min(1, Math.max(0, value))
}

/**
 * Serialize feature vector for storage
 */
export function serializeFeatures(features: FeatureVector): Record<string, number> {
  return { ...features }
}

/**
 * Deserialize feature vector from storage
 */
export function deserializeFeatures(data: Record<string, number>): FeatureVector {
  return {
    company_size_match: data.company_size_match ?? 0.5,
    industry_match: data.industry_match ?? 0.5,
    budget_match: data.budget_match ?? 0.5,
    timeline_match: data.timeline_match ?? 0.5,
    job_title_match: data.job_title_match ?? 0.5,
    buying_intent_score: data.buying_intent_score ?? 0.5,
    authority_level: data.authority_level ?? 0.5,
    company_health_score: data.company_health_score ?? 0.5,
    urgency_indicators: data.urgency_indicators ?? 0.5,
    data_completeness: data.data_completeness ?? 0.5,
    contact_quality: data.contact_quality ?? 0.5,
  }
}
