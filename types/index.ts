import {
  LEAD_STATUSES,
  QUALIFICATION_LABELS,
  USER_ROLES,
  CRITERION_TYPES,
  WEBHOOK_EVENTS,
} from '@/lib/constants'

export type LeadStatus = (typeof LEAD_STATUSES)[number]
export type QualificationLabel = (typeof QUALIFICATION_LABELS)[number]
export type UserRole = (typeof USER_ROLES)[number]
export type CriterionType = (typeof CRITERION_TYPES)[number]
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export interface Organization {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  thank_you_title: string
  thank_you_message: string
  redirect_url: string | null
  public_api_key: string
  settings: Record<string, unknown>
}

export interface OrganizationMember {
  id: string
  created_at: string
  organization_id: string
  user_id: string
  role: UserRole
  user?: {
    email: string
    user_metadata: {
      full_name?: string
      avatar_url?: string
    }
  }
}

export interface Invitation {
  id: string
  created_at: string
  organization_id: string
  email: string
  role: UserRole
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
}

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  organization_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  job_title: string | null
  company_name: string | null
  company_website: string | null
  company_size: string | null
  industry: string | null
  budget_range: string | null
  timeline: string | null
  challenge: string | null
  score: number | null
  label: QualificationLabel | null
  reasoning: string | null
  breakdown: Record<string, { score: number; note: string }> | null
  recommended_action: string | null
  qualified_at: string | null
  qualification_status: 'pending' | 'processing' | 'completed' | 'failed'
  status: LeadStatus
  notes: string | null
  is_duplicate: boolean
  duplicate_of: string | null
  source_ip: string | null
  user_agent: string | null
  referrer: string | null
}

export interface ICPCriterion {
  id: string
  created_at: string
  updated_at: string
  organization_id: string
  name: string
  description: string | null
  data_type: string
  weight: number
  ideal_values: string[]
}

export interface ActivityLog {
  id: string
  created_at: string
  organization_id: string
  lead_id: string | null
  user_id: string | null
  action: string
  details: Record<string, unknown>
  user?: {
    email: string
    user_metadata: {
      full_name?: string
    }
  }
}

export interface Webhook {
  id: string
  created_at: string
  updated_at: string
  organization_id: string
  url: string
  events: WebhookEvent[]
  secret: string
  is_active: boolean
}

export interface WebhookDelivery {
  id: string
  created_at: string
  webhook_id: string
  event: WebhookEvent
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  attempt_count: number
  next_retry_at: string | null
  delivered_at: string | null
}

export interface Notification {
  id: string
  created_at: string
  organization_id: string
  user_id: string
  type: string
  title: string
  message: string | null
  data: Record<string, unknown>
  read: boolean
}

export interface QualificationResult {
  score: number
  label: QualificationLabel
  reasoning: string
  breakdown: Record<string, { score: number; note: string }>
  recommended_action: string
}

export interface AnalyticsOverview {
  total_leads: number
  total_leads_change: number
  hot_leads: number
  hot_leads_change: number
  conversion_rate: number
  conversion_rate_change: number
  average_score: number
  average_score_change: number
  leads_by_day: { date: string; count: number }[]
  score_distribution: { range: string; count: number }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
