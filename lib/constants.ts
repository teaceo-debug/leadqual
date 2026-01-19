export const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
] as const

export const INDUSTRIES = [
  'Technology / SaaS',
  'Finance / Banking',
  'Healthcare',
  'Manufacturing',
  'Retail / E-commerce',
  'Professional Services',
  'Education',
  'Media / Entertainment',
  'Real Estate',
  'Transportation / Logistics',
  'Energy / Utilities',
  'Government',
  'Non-profit',
  'Other',
] as const

export const BUDGET_RANGES = [
  'Less than $10,000',
  '$10,000 - $50,000',
  '$50,000 - $100,000',
  '$100,000+',
] as const

export const TIMELINES = [
  'Immediately',
  '1-3 months',
  '3-6 months',
  '6+ months',
] as const

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'converted',
  'rejected',
  'archived',
] as const

export const QUALIFICATION_LABELS = ['hot', 'warm', 'cold'] as const

export const USER_ROLES = ['admin', 'manager', 'viewer'] as const

export const CRITERION_TYPES = [
  'company_size',
  'industry',
  'job_title',
  'budget',
  'timeline',
  'custom',
] as const

export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.qualified',
  'lead.updated',
] as const

export const DEFAULT_ICP_CRITERIA = [
  {
    name: 'Company Size',
    type: 'company_size' as const,
    weight: 8,
    acceptable_values: ['51-200 employees', '201-500 employees', '500+ employees'],
    is_required: false,
  },
  {
    name: 'Budget',
    type: 'budget' as const,
    weight: 9,
    acceptable_values: ['$50,000 - $100,000', '$100,000+'],
    is_required: true,
  },
  {
    name: 'Timeline',
    type: 'timeline' as const,
    weight: 7,
    acceptable_values: ['Immediately', '1-3 months'],
    is_required: false,
  },
  {
    name: 'Job Title',
    type: 'job_title' as const,
    weight: 6,
    acceptable_values: ['CEO', 'CTO', 'VP', 'Director', 'Head of', 'Manager'],
    is_required: false,
  },
  {
    name: 'Industry',
    type: 'industry' as const,
    weight: 5,
    acceptable_values: ['Technology / SaaS', 'Finance / Banking', 'Healthcare'],
    is_required: false,
  },
]
