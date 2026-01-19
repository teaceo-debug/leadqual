import Anthropic from '@anthropic-ai/sdk'
import {
  COMPANY_SIZES,
  INDUSTRIES,
  BUDGET_RANGES,
  TIMELINES,
  CRITERION_TYPES,
} from '@/lib/constants'
import type { CriterionType } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Core interfaces for ICP generation
export interface GeneratedCriterion {
  name: string
  type: CriterionType
  weight: number
  ideal_values: string[]
  reasoning: string
}

export interface ICPGenerationResult {
  criteria: GeneratedCriterion[]
  summary: string
  confidence: number
  reasoning: string
  company?: {
    name: string
    description: string
    target_market: string
  }
}

export interface CustomerRecord {
  email?: string
  company_name?: string
  company_size?: string
  industry?: string
  job_title?: string
  budget_range?: string
  timeline?: string
  [key: string]: string | undefined
}

export interface PatternAnalysis {
  company_size: { value: string; count: number; percentage: number }[]
  industry: { value: string; count: number; percentage: number }[]
  job_title: { value: string; count: number; percentage: number }[]
  budget_range: { value: string; count: number; percentage: number }[]
  timeline: { value: string; count: number; percentage: number }[]
  total_records: number
  data_completeness: Record<string, number>
}

// Job title categories for normalization
const JOB_TITLE_CATEGORIES = [
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'VP',
  'Director',
  'Head of',
  'Manager',
  'Individual Contributor',
] as const

/**
 * Generate ICP criteria from a company domain using AI research
 */
export async function generateICPFromDomain(domain: string): Promise<ICPGenerationResult> {
  const prompt = buildDomainAnalysisPrompt(domain)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // Validate and normalize the response
  return normalizeGenerationResult(parsed)
}

/**
 * Generate ICP criteria from CSV customer data
 */
export async function generateICPFromCSV(
  customers: CustomerRecord[]
): Promise<ICPGenerationResult> {
  // First, analyze patterns statistically
  const patterns = analyzeCustomerPatterns(customers)

  // Then use AI to interpret patterns and generate recommendations
  const prompt = buildCSVAnalysisPrompt(patterns)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  return normalizeGenerationResult(parsed)
}

/**
 * Analyze customer data to extract patterns
 */
export function analyzeCustomerPatterns(customers: CustomerRecord[]): PatternAnalysis {
  const totalRecords = customers.length

  // Helper to calculate frequency distribution
  const calculateDistribution = (
    field: keyof CustomerRecord
  ): { value: string; count: number; percentage: number }[] => {
    const counts = new Map<string, number>()

    for (const customer of customers) {
      const value = customer[field]
      if (value && typeof value === 'string' && value.trim()) {
        const normalizedValue = value.trim()
        counts.set(normalizedValue, (counts.get(normalizedValue) || 0) + 1)
      }
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }

  // Helper to calculate data completeness
  const calculateCompleteness = (field: keyof CustomerRecord): number => {
    const filledCount = customers.filter(
      (c) => c[field] && typeof c[field] === 'string' && c[field]!.trim()
    ).length
    return Math.round((filledCount / totalRecords) * 100)
  }

  // Normalize job titles to categories
  const normalizeJobTitles = (): { value: string; count: number; percentage: number }[] => {
    const counts = new Map<string, number>()

    for (const customer of customers) {
      const title = customer.job_title?.toLowerCase() || ''
      if (!title) continue

      // Categorize job titles
      let category = 'Individual Contributor'
      if (title.includes('ceo') || title.includes('chief executive')) {
        category = 'CEO'
      } else if (title.includes('cto') || title.includes('chief technology')) {
        category = 'CTO'
      } else if (title.includes('cfo') || title.includes('chief financial')) {
        category = 'CFO'
      } else if (title.includes('coo') || title.includes('chief operating')) {
        category = 'COO'
      } else if (title.includes('vp') || title.includes('vice president')) {
        category = 'VP'
      } else if (title.includes('director')) {
        category = 'Director'
      } else if (title.includes('head of') || title.includes('head,')) {
        category = 'Head of'
      } else if (title.includes('manager') || title.includes('lead')) {
        category = 'Manager'
      }

      counts.set(category, (counts.get(category) || 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / totalRecords) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }

  return {
    company_size: calculateDistribution('company_size'),
    industry: calculateDistribution('industry'),
    job_title: normalizeJobTitles(),
    budget_range: calculateDistribution('budget_range'),
    timeline: calculateDistribution('timeline'),
    total_records: totalRecords,
    data_completeness: {
      company_size: calculateCompleteness('company_size'),
      industry: calculateCompleteness('industry'),
      job_title: calculateCompleteness('job_title'),
      budget_range: calculateCompleteness('budget_range'),
      timeline: calculateCompleteness('timeline'),
    },
  }
}

/**
 * Build the domain analysis prompt for Claude
 */
function buildDomainAnalysisPrompt(domain: string): string {
  return `You are an expert B2B sales strategist helping a company define their Ideal Customer Profile (ICP).

Company Domain: ${domain}

Based on this domain, research and analyze:
1. What products/services does this company offer?
2. Who are their ideal customers?
3. What characteristics define their best-fit customers?

Generate ICP criteria with these EXACT types and values:

For company_size, choose from: ${COMPANY_SIZES.join(', ')}
For industry, choose from: ${INDUSTRIES.join(', ')}
For job_title, choose from: ${JOB_TITLE_CATEGORIES.join(', ')}
For budget, choose from: ${BUDGET_RANGES.join(', ')}
For timeline, choose from: ${TIMELINES.join(', ')}

IMPORTANT:
- Weights must sum to exactly 100
- Use ONLY the exact values listed above for each type
- Select 2-4 ideal values for each criterion based on fit

Respond ONLY with valid JSON in this exact format:
{
  "company": {
    "name": "Detected company name",
    "description": "What they do in 1-2 sentences",
    "target_market": "Who they typically serve"
  },
  "criteria": [
    {
      "name": "Company Size",
      "type": "company_size",
      "weight": 20,
      "ideal_values": ["51-200 employees", "201-500 employees", "500+ employees"],
      "reasoning": "Larger companies have more complex needs that match this product..."
    },
    {
      "name": "Industry",
      "type": "industry",
      "weight": 20,
      "ideal_values": ["Technology / SaaS", "Finance / Banking"],
      "reasoning": "These industries have the budget and technical sophistication..."
    },
    {
      "name": "Budget",
      "type": "budget",
      "weight": 25,
      "ideal_values": ["$50,000 - $100,000", "$100,000+"],
      "reasoning": "Based on typical enterprise pricing in this space..."
    },
    {
      "name": "Timeline",
      "type": "timeline",
      "weight": 15,
      "ideal_values": ["Immediately", "1-3 months"],
      "reasoning": "Faster timelines indicate active evaluation..."
    },
    {
      "name": "Job Title",
      "type": "job_title",
      "weight": 20,
      "ideal_values": ["VP", "Director", "Head of"],
      "reasoning": "These roles have buying authority for this type of solution..."
    }
  ],
  "summary": "Your ideal customer is a mid-to-large technology company with active buying intent and budget allocated for solutions like yours.",
  "confidence": 85,
  "reasoning": "Based on the company's positioning and typical B2B patterns for this market segment..."
}`
}

/**
 * Build the CSV pattern analysis prompt for Claude
 */
function buildCSVAnalysisPrompt(patterns: PatternAnalysis): string {
  const formatDistribution = (
    dist: { value: string; count: number; percentage: number }[]
  ): string => {
    if (dist.length === 0) return 'No data available'
    return dist
      .slice(0, 5)
      .map((d) => `${d.value}: ${d.count} (${d.percentage}%)`)
      .join(', ')
  }

  return `You are analyzing customer data to identify the Ideal Customer Profile (ICP).

## Customer Data Statistics (${patterns.total_records} total customers):

### Company Size Distribution:
${formatDistribution(patterns.company_size)}
Data completeness: ${patterns.data_completeness.company_size}%

### Industry Distribution:
${formatDistribution(patterns.industry)}
Data completeness: ${patterns.data_completeness.industry}%

### Job Title Distribution:
${formatDistribution(patterns.job_title)}
Data completeness: ${patterns.data_completeness.job_title}%

### Budget Distribution:
${formatDistribution(patterns.budget_range)}
Data completeness: ${patterns.data_completeness.budget_range}%

### Timeline Distribution:
${formatDistribution(patterns.timeline)}
Data completeness: ${patterns.data_completeness.timeline}%

Based on these patterns:
1. Which values appear most frequently?
2. What characteristics cluster together?
3. Which segments likely represent the best customers?

Generate ICP criteria that capture these patterns. Weight criteria by their predictive importance, considering data completeness.

For any values not in the standard lists, map them to the closest match:
- company_size: ${COMPANY_SIZES.join(', ')}
- industry: ${INDUSTRIES.join(', ')}
- job_title: ${JOB_TITLE_CATEGORIES.join(', ')}
- budget: ${BUDGET_RANGES.join(', ')}
- timeline: ${TIMELINES.join(', ')}

IMPORTANT:
- Weights must sum to exactly 100
- Weight criteria with low data completeness lower
- Use ONLY the exact values from the lists above
- Select the top 2-4 values for each criterion based on frequency

Respond ONLY with valid JSON in this exact format:
{
  "criteria": [
    {
      "name": "Company Size",
      "type": "company_size",
      "weight": 20,
      "ideal_values": ["51-200 employees", "201-500 employees"],
      "reasoning": "60% of customers fall into these segments..."
    }
  ],
  "summary": "Based on your existing customer data, your ideal customer is...",
  "confidence": 75,
  "reasoning": "Confidence is moderate due to incomplete data in some fields..."
}`
}

/**
 * Normalize and validate the AI-generated result
 */
function normalizeGenerationResult(parsed: Record<string, unknown>): ICPGenerationResult {
  const rawCriteria = (parsed.criteria as Array<Record<string, unknown>>) || []

  // Validate and fix criteria
  const normalizedCriteria = rawCriteria.map((c) => {
    const type = validateCriterionType(c.type as string | undefined)
    const rawValues = Array.isArray(c.ideal_values) ? c.ideal_values : []
    return {
      name: (c.name as string) || '',
      type,
      weight: Math.max(0, Math.min(100, (c.weight as number) || 20)),
      ideal_values: normalizeIdealValues(type, rawValues.map(String)),
      reasoning: (c.reasoning as string) || '',
    }
  })

  // Ensure weights sum to 100
  const totalWeight = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight !== 100 && normalizedCriteria.length > 0) {
    const factor = 100 / totalWeight
    normalizedCriteria.forEach((c) => {
      c.weight = Math.round(c.weight * factor)
    })
    // Handle rounding errors by adjusting the first criterion
    const newTotal = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0)
    if (newTotal !== 100) {
      normalizedCriteria[0].weight += 100 - newTotal
    }
  }

  return {
    criteria: normalizedCriteria,
    summary: (parsed.summary as string) || 'ICP criteria generated successfully.',
    confidence: Math.max(0, Math.min(100, (parsed.confidence as number) || 70)),
    reasoning: (parsed.reasoning as string) || '',
    company: parsed.company as ICPGenerationResult['company'],
  }
}

/**
 * Validate criterion type
 */
function validateCriterionType(type: string | undefined): CriterionType {
  if (!type) return 'custom'
  const validTypes = CRITERION_TYPES as readonly string[]
  if (validTypes.includes(type)) {
    return type as CriterionType
  }
  return 'custom'
}

/**
 * Normalize ideal values to match predefined options
 */
function normalizeIdealValues(type: string | undefined, values: string[]): string[] {
  if (!type) return values
  const validValues = getValidValuesForType(type)
  if (!validValues || validValues.length === 0) {
    return values
  }

  return values
    .map((v) => findClosestMatch(v, validValues))
    .filter((v): v is string => v !== null)
}

/**
 * Get valid values for a criterion type
 */
function getValidValuesForType(type: string): readonly string[] | null {
  switch (type) {
    case 'company_size':
      return COMPANY_SIZES
    case 'industry':
      return INDUSTRIES
    case 'budget':
      return BUDGET_RANGES
    case 'timeline':
      return TIMELINES
    case 'job_title':
      return JOB_TITLE_CATEGORIES
    default:
      return null
  }
}

/**
 * Find the closest matching value from a list of valid options
 */
function findClosestMatch(value: string, validOptions: readonly string[]): string | null {
  const normalizedValue = value.toLowerCase().trim()

  // Exact match
  const exactMatch = validOptions.find((v) => v.toLowerCase() === normalizedValue)
  if (exactMatch) return exactMatch

  // Partial match
  const partialMatch = validOptions.find(
    (v) =>
      v.toLowerCase().includes(normalizedValue) || normalizedValue.includes(v.toLowerCase())
  )
  if (partialMatch) return partialMatch

  // Return first valid option as fallback (or null if strict matching needed)
  return validOptions.includes(value as (typeof validOptions)[number]) ? value : validOptions[0]
}

/**
 * Parse CSV text into customer records
 */
export function parseCSVText(csvText: string): CustomerRecord[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = parseCSVLine(lines[0]).map((h) => normalizeHeader(h))
  const records: CustomerRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const record: CustomerRecord = {}

    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j]
      const value = values[j]?.trim()
      if (header && value) {
        record[header] = value
      }
    }

    if (Object.keys(record).length > 0) {
      records.push(record)
    }
  }

  return records
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Normalize CSV header to standard field names
 */
function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')

  const mappings: Record<string, string> = {
    email: 'email',
    email_address: 'email',
    company: 'company_name',
    company_name: 'company_name',
    organization: 'company_name',
    size: 'company_size',
    company_size: 'company_size',
    employees: 'company_size',
    employee_count: 'company_size',
    industry: 'industry',
    sector: 'industry',
    vertical: 'industry',
    title: 'job_title',
    job_title: 'job_title',
    role: 'job_title',
    position: 'job_title',
    budget: 'budget_range',
    budget_range: 'budget_range',
    budget_amount: 'budget_range',
    timeline: 'timeline',
    timeframe: 'timeline',
    purchase_timeline: 'timeline',
  }

  return mappings[normalized] || normalized
}
