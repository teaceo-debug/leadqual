import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerLeadQualifiedWebhook } from '@/lib/webhooks'
import { sendHotLeadNotification } from '@/lib/email'
import {
  extractFeatures,
  calculateWeightedScore,
  getScoreLabel,
  serializeFeatures,
  DEFAULT_FEATURE_WEIGHTS,
  type FeatureVector,
} from '@/lib/features'
import { enrichLead, getLeadEnrichments } from '@/lib/enrich'
import { getActiveScoringModel } from '@/lib/learn'
import type { Lead, ICPCriterion, QualificationResult } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function qualifyLead(leadId: string): Promise<QualificationResult | null> {
  const supabase = createAdminClient()

  // Get lead data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    console.error('Failed to fetch lead:', leadError)
    return null
  }

  // Update status to processing
  await supabase
    .from('leads')
    .update({ qualification_status: 'processing' })
    .eq('id', leadId)

  // Get ICP criteria for the organization
  const { data: criteria, error: criteriaError } = await supabase
    .from('icp_criteria')
    .select('*')
    .eq('organization_id', lead.organization_id)
    .order('sort_order')

  if (criteriaError) {
    console.error('Failed to fetch ICP criteria:', criteriaError)
    await supabase
      .from('leads')
      .update({ qualification_status: 'failed' })
      .eq('id', leadId)
    return null
  }

  // Get or create enrichments for ML features
  let enrichments = await getLeadEnrichments(leadId)
  if (!enrichments.intent && !enrichments.company) {
    // Run enrichment if not already done
    try {
      enrichments = await enrichLead(lead as Lead)
    } catch (enrichError) {
      console.warn('Enrichment failed, continuing without:', enrichError)
    }
  }

  // Extract feature vector
  const features = extractFeatures(
    lead as Lead,
    criteria as ICPCriterion[],
    {
      intent: enrichments.intent ? {
        buying_intent_score: enrichments.intent.buying_intent_score,
        urgency_score: enrichments.intent.urgency_score,
      } : undefined,
      authority: enrichments.authority ? {
        authority_level: enrichments.authority.authority_level,
      } : undefined,
      company: enrichments.company ? {
        health_score: enrichments.company.health_score / 10, // Normalize 1-10 to 0-1
      } : undefined,
    }
  )

  // Get learned weights if available, otherwise use defaults
  const scoringModel = await getActiveScoringModel(lead.organization_id)
  const weights = scoringModel?.featureWeights || DEFAULT_FEATURE_WEIGHTS
  const modelVersion = scoringModel?.modelVersion || null

  // Build the prompt
  const prompt = buildQualificationPrompt(lead as Lead, criteria as ICPCriterion[])

  let result: QualificationResult

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text content
    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    result = JSON.parse(jsonMatch[0])
  } catch (aiError) {
    console.warn('AI qualification failed, using ML-based scoring:', aiError)
    // Use ML-based feature scoring instead of simple rule-based fallback
    result = calculateMLScore(lead as Lead, criteria as ICPCriterion[], features, weights, enrichments)
  }

  // Update lead with qualification results
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      score: result.score,
      label: result.label,
      reasoning: result.reasoning,
      breakdown: result.breakdown,
      recommended_action: result.recommended_action,
      qualified_at: new Date().toISOString(),
      qualification_status: 'completed',
    })
    .eq('id', leadId)

  if (updateError) {
    console.error('Failed to update lead with results:', updateError)
    await supabase
      .from('leads')
      .update({ qualification_status: 'failed' })
      .eq('id', leadId)
    return null
  }

  // Store scoring history for ML learning
  await supabase.from('scoring_history').insert({
    lead_id: leadId,
    score: result.score,
    label: result.label,
    model_version: modelVersion,
    feature_vector: serializeFeatures(features),
  })

  // Log activity
  await supabase.from('activity_log').insert({
    organization_id: lead.organization_id,
    lead_id: leadId,
    action: 'lead.qualified',
    details: { score: result.score, label: result.label },
  })

  // Trigger lead.qualified webhook
  triggerLeadQualifiedWebhook(lead.organization_id, {
    id: leadId,
    ...lead,
    score: result.score,
    label: result.label,
    reasoning: result.reasoning,
    breakdown: result.breakdown,
    recommended_action: result.recommended_action,
    qualified_at: new Date().toISOString(),
  }).catch(console.error)

  // Create notification if hot lead
  if (result.label === 'hot') {
    // Get all admins and managers
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', lead.organization_id)
      .in('role', ['admin', 'manager'])

    if (members) {
      const notifications = members.map((m) => ({
        organization_id: lead.organization_id,
        user_id: m.user_id,
        type: 'hot_lead',
        title: `New hot lead: ${lead.first_name} ${lead.last_name}`,
        message: `${lead.company_name || lead.email} - Score: ${result.score}`,
        data: { lead_id: leadId, score: result.score },
      }))

      await supabase.from('notifications').insert(notifications)
    }

    // Send email notification for hot lead
    sendHotLeadNotification(lead.organization_id, {
      lead: lead as Lead,
      score: result.score,
      reasoning: result.reasoning,
      recommendedAction: result.recommended_action,
    }).catch(console.error)
  }

  return result
}

// ML-based scoring using feature vectors and learned weights
function calculateMLScore(
  lead: Lead,
  criteria: ICPCriterion[],
  features: FeatureVector,
  weights: FeatureVector,
  enrichments: {
    company?: { summary?: string; health_score?: number }
    intent?: { summary?: string; buying_intent_score?: number }
    authority?: { authority_level?: number; buying_role?: string }
  }
): QualificationResult {
  // Calculate weighted score from features
  const score = calculateWeightedScore(features, weights)
  const label = getScoreLabel(score)

  // Build breakdown from feature components
  const breakdown: Record<string, { score: number; note: string }> = {}

  // ICP alignment breakdown
  breakdown['Company Size'] = {
    score: Math.round(features.company_size_match * 100),
    note: features.company_size_match >= 0.8 ? 'Strong match' :
          features.company_size_match >= 0.5 ? 'Partial match' : 'Limited match',
  }
  breakdown['Industry'] = {
    score: Math.round(features.industry_match * 100),
    note: features.industry_match >= 0.8 ? 'Target industry' :
          features.industry_match >= 0.5 ? 'Related industry' : 'Outside target',
  }
  breakdown['Budget'] = {
    score: Math.round(features.budget_match * 100),
    note: features.budget_match >= 0.8 ? 'Within ideal range' :
          features.budget_match >= 0.5 ? 'Acceptable range' : 'Below target',
  }
  breakdown['Timeline'] = {
    score: Math.round(features.timeline_match * 100),
    note: features.timeline_match >= 0.8 ? 'Ready to buy' :
          features.timeline_match >= 0.5 ? 'Active evaluation' : 'Long-term prospect',
  }
  breakdown['Authority'] = {
    score: Math.round(features.authority_level * 100),
    note: enrichments.authority?.buying_role || (
      features.authority_level >= 0.8 ? 'Decision maker' :
      features.authority_level >= 0.5 ? 'Influencer' : 'End user'
    ),
  }
  breakdown['Buying Intent'] = {
    score: Math.round(features.buying_intent_score * 100),
    note: features.buying_intent_score >= 0.7 ? 'High intent signals' :
          features.buying_intent_score >= 0.4 ? 'Moderate interest' : 'Early stage',
  }

  // Build reasoning from enrichment summaries
  const reasoningParts: string[] = []

  if (enrichments.intent?.summary) {
    reasoningParts.push(enrichments.intent.summary)
  } else {
    reasoningParts.push(
      label === 'hot' ? 'Strong buying signals detected.' :
      label === 'warm' ? 'Moderate interest with some gaps.' :
      'Limited engagement indicators.'
    )
  }

  if (enrichments.company?.summary) {
    reasoningParts.push(enrichments.company.summary)
  }

  const reasoning = reasoningParts.join(' ') || `ML-scored lead at ${score}/100 based on ${Object.keys(features).length} features.`

  // Determine recommended action based on score and features
  let recommendedAction: string
  if (label === 'hot') {
    if (features.authority_level >= 0.7) {
      recommendedAction = 'Schedule a discovery call with this decision maker immediately'
    } else {
      recommendedAction = 'Request introduction to decision maker, then schedule call'
    }
  } else if (label === 'warm') {
    if (features.buying_intent_score >= 0.6) {
      recommendedAction = 'Send personalized demo invitation to accelerate timeline'
    } else {
      recommendedAction = 'Nurture with relevant case studies and follow up in 2 weeks'
    }
  } else {
    if (features.data_completeness < 0.5) {
      recommendedAction = 'Gather more information before further qualification'
    } else {
      recommendedAction = 'Add to automated nurture sequence'
    }
  }

  return {
    score,
    label,
    reasoning,
    breakdown,
    recommended_action: recommendedAction,
  }
}

// Helper to get lead field value by criterion name
function getLeadFieldValue(lead: Lead, criterionName: string): string | null {
  const fieldMap: Record<string, keyof Lead> = {
    'company_size': 'company_size',
    'company size': 'company_size',
    'industry': 'industry',
    'budget': 'budget_range',
    'budget_range': 'budget_range',
    'timeline': 'timeline',
    'job_title': 'job_title',
    'job title': 'job_title',
    'role': 'job_title',
  }

  const normalizedName = criterionName.toLowerCase()
  const fieldKey = fieldMap[normalizedName]

  if (fieldKey && lead[fieldKey]) {
    return String(lead[fieldKey])
  }

  return null
}

function buildQualificationPrompt(lead: Lead, criteria: ICPCriterion[]): string {
  const criteriaList = criteria
    .map((c) => {
      const values = Array.isArray(c.ideal_values) && c.ideal_values.length > 0
        ? c.ideal_values.join(', ')
        : 'Any'
      return `- ${c.name} (Weight: ${c.weight}%)
  ${c.description ? `Description: ${c.description}\n  ` : ''}Ideal values: ${values}`
    })
    .join('\n')

  return `You are a B2B lead qualification expert. Evaluate this lead against the Ideal Customer Profile criteria provided.

## Ideal Customer Profile Criteria:
${criteriaList}

## Lead Information:
- Name: ${lead.first_name || ''} ${lead.last_name || ''}
- Email: ${lead.email}
- Job Title: ${lead.job_title || 'Not provided'}
- Company: ${lead.company_name || 'Not provided'}
- Website: ${lead.company_website || 'Not provided'}
- Company Size: ${lead.company_size || 'Not provided'}
- Industry: ${lead.industry || 'Not provided'}
- Budget: ${lead.budget_range || 'Not provided'}
- Timeline: ${lead.timeline || 'Not provided'}
- Challenge: ${lead.challenge || 'Not provided'}

## Scoring Instructions:
1. Score each criterion from 0-100 based on how well the lead matches
2. Apply the weights to calculate an overall weighted score
3. Assign a label: "hot" (80+), "warm" (50-79), "cold" (below 50)
4. If any REQUIRED criterion scores below 30, automatically label as "cold"
5. Provide clear, specific reasoning for your scoring
6. Suggest a concrete recommended action

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "label": "<hot|warm|cold>",
  "reasoning": "<2-3 sentence explanation of the overall assessment>",
  "breakdown": {
    "<criterion_name>": { "score": <number>, "note": "<brief explanation>" }
  },
  "recommended_action": "<specific next step suggestion>"
}`
}
