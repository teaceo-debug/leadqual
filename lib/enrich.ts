import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Lead } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Company research enrichment data
 */
export interface CompanyResearch {
  company_size_estimate: string | null
  technology_indicators: string[]
  growth_signals: string[]
  pain_points: string[]
  health_score: number // 1-10
  confidence: number // 0-1
  summary: string
}

/**
 * Intent analysis enrichment data
 */
export interface IntentAnalysis {
  problem_awareness: number // 1-5
  solution_awareness: number // 1-5
  urgency_indicators: string[]
  authority_to_purchase: number // 1-5
  buying_intent_score: number // 1-100
  urgency_score: number // 0-1
  summary: string
}

/**
 * Authority assessment enrichment data
 */
export interface AuthorityAssessment {
  decision_maker_likelihood: number // 0-1
  title_seniority: string
  buying_role: string
  authority_level: number // 0-1
}

/**
 * Analyze company for B2B sales qualification
 */
export async function analyzeCompany(lead: Lead): Promise<CompanyResearch | null> {
  if (!lead.company_name) {
    return null
  }

  const prompt = `Analyze this company for B2B sales qualification:
Company: ${lead.company_name}
Website: ${lead.company_website || 'Not provided'}
Industry: ${lead.industry || 'Not provided'}
Company Size: ${lead.company_size || 'Not provided'}

Based on the available information, provide your best assessment. If information is limited, make reasonable inferences but indicate lower confidence.

Provide your analysis in JSON format:
{
  "company_size_estimate": "string describing employee count range",
  "technology_indicators": ["list of technology/tools they likely use"],
  "growth_signals": ["list of growth indicators like hiring, funding, expansion"],
  "pain_points": ["list of likely business challenges relevant to B2B sales"],
  "health_score": <number 1-10 indicating company health/stability>,
  "confidence": <number 0-1 indicating confidence in this analysis>,
  "summary": "2-3 sentence summary of the company assessment"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return null
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const result = JSON.parse(jsonMatch[0]) as CompanyResearch
    return {
      company_size_estimate: result.company_size_estimate || null,
      technology_indicators: result.technology_indicators || [],
      growth_signals: result.growth_signals || [],
      pain_points: result.pain_points || [],
      health_score: Math.min(10, Math.max(1, result.health_score || 5)),
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      summary: result.summary || '',
    }
  } catch (error) {
    console.error('Company analysis failed:', error)
    return null
  }
}

/**
 * Analyze buying intent signals
 */
export async function analyzeIntentSignals(lead: Lead): Promise<IntentAnalysis | null> {
  const prompt = `Analyze buying intent for a B2B lead:
Challenge/Pain Point: ${lead.challenge || 'Not provided'}
Timeline: ${lead.timeline || 'Not provided'}
Budget: ${lead.budget_range || 'Not provided'}
Job Title: ${lead.job_title || 'Not provided'}
Company: ${lead.company_name || 'Not provided'}
Company Size: ${lead.company_size || 'Not provided'}

Evaluate:
1. Problem awareness (1-5): How well do they understand their problem?
2. Solution awareness (1-5): Are they aware of potential solutions?
3. Urgency indicators: What suggests they need to act soon?
4. Authority to purchase (1-5): Based on title, how likely are they to have decision-making power?
5. Buying intent score (1-100): Overall likelihood they're ready to buy

Respond with JSON:
{
  "problem_awareness": <1-5>,
  "solution_awareness": <1-5>,
  "urgency_indicators": ["list of urgency signals detected"],
  "authority_to_purchase": <1-5>,
  "buying_intent_score": <1-100>,
  "urgency_score": <0-1, normalized urgency>,
  "summary": "2-3 sentence assessment of buying intent"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return null
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const result = JSON.parse(jsonMatch[0]) as IntentAnalysis
    return {
      problem_awareness: Math.min(5, Math.max(1, result.problem_awareness || 3)),
      solution_awareness: Math.min(5, Math.max(1, result.solution_awareness || 3)),
      urgency_indicators: result.urgency_indicators || [],
      authority_to_purchase: Math.min(5, Math.max(1, result.authority_to_purchase || 3)),
      buying_intent_score: Math.min(100, Math.max(1, result.buying_intent_score || 50)),
      urgency_score: Math.min(1, Math.max(0, result.urgency_score || 0.5)),
      summary: result.summary || '',
    }
  } catch (error) {
    console.error('Intent analysis failed:', error)
    return null
  }
}

/**
 * Assess authority level based on job title
 */
export function assessAuthority(lead: Lead): AuthorityAssessment {
  const title = (lead.job_title || '').toLowerCase()

  // Executive level
  const executiveTitles = ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'chief', 'president', 'owner', 'founder', 'partner']
  if (executiveTitles.some(t => title.includes(t))) {
    return {
      decision_maker_likelihood: 0.95,
      title_seniority: 'executive',
      buying_role: 'decision_maker',
      authority_level: 1.0,
    }
  }

  // VP level
  const vpTitles = ['vp', 'vice president', 'svp', 'evp', 'head of']
  if (vpTitles.some(t => title.includes(t))) {
    return {
      decision_maker_likelihood: 0.85,
      title_seniority: 'vp',
      buying_role: 'decision_maker',
      authority_level: 0.9,
    }
  }

  // Director level
  const directorTitles = ['director', 'senior director', 'managing director']
  if (directorTitles.some(t => title.includes(t))) {
    return {
      decision_maker_likelihood: 0.7,
      title_seniority: 'director',
      buying_role: 'influencer',
      authority_level: 0.75,
    }
  }

  // Manager level
  const managerTitles = ['manager', 'lead', 'senior', 'principal', 'team lead']
  if (managerTitles.some(t => title.includes(t))) {
    return {
      decision_maker_likelihood: 0.5,
      title_seniority: 'manager',
      buying_role: 'influencer',
      authority_level: 0.6,
    }
  }

  // Individual contributor
  return {
    decision_maker_likelihood: 0.2,
    title_seniority: 'individual_contributor',
    buying_role: 'user',
    authority_level: 0.3,
  }
}

/**
 * Store enrichment data in database
 */
async function storeEnrichment(
  leadId: string,
  enrichmentType: string,
  data: Record<string, unknown>,
  confidence: number,
  source = 'claude'
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('lead_enrichments').insert({
    lead_id: leadId,
    enrichment_type: enrichmentType,
    data,
    confidence,
    source,
  })
}

/**
 * Orchestrate all enrichments for a lead
 */
export async function enrichLead(lead: Lead): Promise<{
  company?: CompanyResearch
  intent?: IntentAnalysis
  authority: AuthorityAssessment
}> {
  // Run company and intent analysis in parallel
  const [company, intent] = await Promise.all([
    analyzeCompany(lead),
    analyzeIntentSignals(lead),
  ])

  // Authority assessment is synchronous
  const authority = assessAuthority(lead)

  // Store enrichments in database
  const storePromises: Promise<void>[] = []

  if (company) {
    storePromises.push(
      storeEnrichment(lead.id, 'company_research', company as unknown as Record<string, unknown>, company.confidence)
    )
  }

  if (intent) {
    storePromises.push(
      storeEnrichment(lead.id, 'intent_analysis', intent as unknown as Record<string, unknown>, 0.8)
    )
  }

  storePromises.push(
    storeEnrichment(lead.id, 'authority_assessment', authority as unknown as Record<string, unknown>, 0.9, 'rule_based')
  )

  await Promise.all(storePromises)

  return { company: company || undefined, intent: intent || undefined, authority }
}

/**
 * Get existing enrichments for a lead
 */
export async function getLeadEnrichments(leadId: string): Promise<{
  company?: CompanyResearch
  intent?: IntentAnalysis
  authority?: AuthorityAssessment
}> {
  const supabase = createAdminClient()

  const { data: enrichments } = await supabase
    .from('lead_enrichments')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (!enrichments || enrichments.length === 0) {
    return {}
  }

  const result: {
    company?: CompanyResearch
    intent?: IntentAnalysis
    authority?: AuthorityAssessment
  } = {}

  for (const e of enrichments) {
    if (e.enrichment_type === 'company_research' && !result.company) {
      result.company = e.data as unknown as CompanyResearch
    } else if (e.enrichment_type === 'intent_analysis' && !result.intent) {
      result.intent = e.data as unknown as IntentAnalysis
    } else if (e.enrichment_type === 'authority_assessment' && !result.authority) {
      result.authority = e.data as unknown as AuthorityAssessment
    }
  }

  return result
}
