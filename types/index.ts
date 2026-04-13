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

// API Key types
export type APIKeyScope = 'leads:read' | 'leads:write' | 'icp:read' | 'analytics:read'

export interface APIKey {
  id: string
  organization_id: string
  name: string
  key_hash: string
  key_prefix: string
  scopes: APIKeyScope[]
  rate_limit: number
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  created_by: string | null
  revoked_at: string | null
  revoked_by: string | null
}

export interface APIUsage {
  id: string
  api_key_id: string
  organization_id: string
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface APIUsageStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  rate_limited_requests: number
  average_response_time_ms: number
  requests_by_day: { date: string; count: number }[]
  requests_by_endpoint: { endpoint: string; count: number }[]
}

// Form builder types
export const FORM_FIELD_TYPES = [
  'short_text',
  'long_text',
  'email',
  'phone',
  'number',
  'multiple_choice',
  'dropdown',
  'checkbox',
  'page_break',
] as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

export interface FormFieldOption {
  id: string
  label: string
  value: string
}

export interface FormFieldCondition {
  field_id: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty'
  value?: string
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  required: boolean
  options?: FormFieldOption[]
  validation?: {
    min_length?: number
    max_length?: number
    min?: number
    max?: number
    pattern?: string
  }
  conditions?: FormFieldCondition[]
}

export interface FormBranding {
  logo_url?: string
  primary_color?: string
  background_color?: string
  text_color?: string
  font_family?: string
  border_radius?: string
  button_text?: string
}

export interface FormFacebookSettings {
  pixel_id?: string
  access_token?: string
  test_event_code?: string
}

export interface Form {
  id: string
  created_at: string
  updated_at: string
  organization_id: string
  name: string
  description: string | null
  slug: string
  status: 'draft' | 'published' | 'archived'
  fields: FormField[]
  settings: Record<string, unknown>
  branding: FormBranding
  facebook: FormFacebookSettings
  thank_you_title: string
  thank_you_message: string
  redirect_url: string | null
  submission_count: number
  view_count: number
}

export interface FormSubmission {
  id: string
  created_at: string
  form_id: string
  organization_id: string
  data: Record<string, unknown>
  source_ip: string | null
  user_agent: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  lead_id: string | null
  qualification_status: 'pending' | 'processing' | 'completed' | 'skipped'
}

// API Response types for public API
export interface APIResponse<T> {
  data: T
  meta?: {
    page?: number
    per_page?: number
    total?: number
  }
}

export interface APIError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
