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

  // Behavioral features (from pixel/tracking data)
  engagement_score: number         // Page views, time on site, interactions
  behavioral_intent_score: number  // Pricing/demo page visits, high-intent actions
  recency_score: number            // How recently they engaged
  frequency_score: number          // Visit frequency
  channel_quality_score: number    // Based on traffic source (paid vs organic)

  // Data quality features
  data_completeness: number
  contact_quality: number
}

/**
 * Behavioral scores from tracking data
 */
export interface BehavioralScores {
  total_page_views?: number
  unique_pages_viewed?: number
  total_time_on_site?: number
  pricing_page_views?: number
  demo_page_views?: number
  case_study_views?: number
  feature_page_views?: number
  forms_started?: number
  forms_completed?: number
  cta_clicks?: number
  days_since_first_visit?: number
  days_since_last_visit?: number
  visit_frequency?: number
  engagement_score?: number
  intent_score?: number
  recency_score?: number
  frequency_score?: number
  behavioral_score?: number
}

/**
 * Tracking data from ad platforms
 */
export interface TrackingParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  fbclid?: string
  gclid?: string
  ttclid?: string
}

/**
 * Default feature weights for initial scoring
 * These are overridden by learned weights when available
 *
 * Weight distribution:
 * - ICP alignment: 35% (company fit)
 * - AI enrichment: 25% (context understanding)
 * - Behavioral: 30% (engagement signals)
 * - Data quality: 10% (completeness/validity)
 */
export const DEFAULT_FEATURE_WEIGHTS: FeatureVector = {
  // ICP alignment features (35%)
  company_size_match: 0.08,
  industry_match: 0.07,
  budget_match: 0.10,
  timeline_match: 0.05,
  job_title_match: 0.05,

  // AI enrichment features (25%)
  buying_intent_score: 0.08,
  authority_level: 0.07,
  company_health_score: 0.05,
  urgency_indicators: 0.05,

  // Behavioral features (30%) - These are key differentiators!
  engagement_score: 0.08,           // High engagement = interested
  behavioral_intent_score: 0.12,    // Pricing/demo views = buying signals
  recency_score: 0.05,              // Recent activity = active interest
  frequency_score: 0.03,            // Multiple visits = consideration stage
  channel_quality_score: 0.02,      // Paid traffic often higher intent

  // Data quality (10%)
  data_completeness: 0.05,
  contact_quality: 0.05,
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
  },
  behavioral?: BehavioralScores,
  tracking?: TrackingParams
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

    // Behavioral features (from pixel/tracking data)
    engagement_score: normalizeScore(behavioral?.engagement_score, 0.5),
    behavioral_intent_score: calculateBehavioralIntent(behavioral),
    recency_score: normalizeScore(behavioral?.recency_score, 0.5),
    frequency_score: normalizeScore(behavioral?.frequency_score, 0.5),
    channel_quality_score: calculateChannelQuality(tracking),

    // Data quality features
    data_completeness: calculateDataCompleteness(lead),
    contact_quality: calculateContactQuality(lead),
  }
}

/**
 * Calculate behavioral intent score from high-value page views
 */
function calculateBehavioralIntent(behavioral?: BehavioralScores): number {
  if (!behavioral) return 0.5

  // Use pre-calculated intent score if available
  if (behavioral.intent_score !== undefined) {
    return normalizeScore(behavioral.intent_score, 0.5)
  }

  // Calculate from individual signals
  let intentScore = 0.3 // Base score

  // Pricing page is strongest buying signal
  if (behavioral.pricing_page_views) {
    intentScore += Math.min(0.3, behavioral.pricing_page_views * 0.15)
  }

  // Demo page shows active evaluation
  if (behavioral.demo_page_views) {
    intentScore += Math.min(0.2, behavioral.demo_page_views * 0.1)
  }

  // Case studies indicate serious consideration
  if (behavioral.case_study_views) {
    intentScore += Math.min(0.1, behavioral.case_study_views * 0.05)
  }

  // CTA clicks show action-taking behavior
  if (behavioral.cta_clicks) {
    intentScore += Math.min(0.1, behavioral.cta_clicks * 0.05)
  }

  // Form completion is high intent
  if (behavioral.forms_completed) {
    intentScore += 0.1
  }

  return Math.min(1, intentScore)
}

/**
 * Calculate channel quality score based on traffic source
 */
function calculateChannelQuality(tracking?: TrackingParams): number {
  if (!tracking) return 0.5

  // Paid traffic from major platforms tends to be higher intent
  if (tracking.gclid) return 0.8  // Google Ads - high intent search
  if (tracking.fbclid) return 0.7 // Facebook Ads - targeted audience
  if (tracking.ttclid) return 0.65 // TikTok Ads - growing B2B presence

  // Evaluate UTM source/medium
  const source = tracking.utm_source?.toLowerCase() || ''
  const medium = tracking.utm_medium?.toLowerCase() || ''

  // Paid search is highest quality
  if (medium === 'cpc' || medium === 'ppc' || medium === 'paid') {
    if (source === 'google' || source === 'bing') return 0.8
    return 0.7
  }

  // Organic search indicates active research
  if (medium === 'organic' || source === 'google' || source === 'bing') {
    return 0.65
  }

  // Referral traffic can be high quality
  if (medium === 'referral') return 0.6

  // Social can vary
  if (medium === 'social') return 0.55

  // Email campaigns to existing lists
  if (medium === 'email') return 0.7

  // Direct traffic is moderate (could be returning visitor)
  if (source === 'direct' || source === '(direct)') return 0.55

  return 0.5
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
    engagement_score: data.engagement_score ?? 0.5,
    behavioral_intent_score: data.behavioral_intent_score ?? 0.5,
    recency_score: data.recency_score ?? 0.5,
    frequency_score: data.frequency_score ?? 0.5,
    channel_quality_score: data.channel_quality_score ?? 0.5,
    data_completeness: data.data_completeness ?? 0.5,
    contact_quality: data.contact_quality ?? 0.5,
  }
}
