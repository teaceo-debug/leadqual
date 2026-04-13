import type { FormField, FormBranding } from '@/types'

export interface FormTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  fields: FormField[]
  branding: FormBranding
  settings: Record<string, unknown>
}

function field(
  type: FormField['type'],
  label: string,
  opts: Partial<FormField> = {}
): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    placeholder: '',
    required: false,
    ...opts,
  }
}

function options(labels: string[]) {
  return labels.map((label) => ({
    id: crypto.randomUUID(),
    label,
    value: crypto.randomUUID(),
  }))
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Simple contact form — name, email, phone, company. Best for top-of-funnel.',
    icon: 'UserPlus',
    category: 'Basic',
    branding: { primary_color: '#2563EB', button_text: 'Get Started' },
    settings: {},
    fields: [
      field('short_text', 'First Name', { required: true, placeholder: 'John' }),
      field('short_text', 'Last Name', { required: true, placeholder: 'Smith' }),
      field('email', 'Email Address', { required: true, placeholder: 'john@company.com' }),
      field('phone', 'Phone Number', { placeholder: '(555) 000-0000' }),
      field('short_text', 'Company', { placeholder: 'Acme Inc.' }),
    ],
  },
  {
    id: 'qualifier',
    name: 'Application / Qualifier',
    description: 'Multi-step with budget gate. Only qualified leads fire pixel events. Built for paid ads.',
    icon: 'Shield',
    category: 'Advanced',
    branding: { primary_color: '#1a56db', button_text: 'Submit Application' },
    settings: {},
    fields: [
      field('short_text', 'First Name', { required: true }),
      field('short_text', 'Last Name', { required: true }),
      field('email', 'Email Address', { required: true }),
      field('phone', 'Phone Number', { required: true }),
      field('page_break', 'Your Business'),
      field('dropdown', 'Industry', {
        options: options(['Technology / SaaS', 'Finance', 'Healthcare', 'E-commerce', 'Professional Services', 'Other']),
      }),
      field('dropdown', 'Company Size', {
        options: options(['1-10', '11-50', '51-200', '201-500', '500+']),
      }),
      field('page_break', 'Budget & Timeline'),
      field('multiple_choice', 'Budget Range', {
        required: true,
        options: options(['Under $10,000', '$10,000 - $25,000', '$25,000 - $50,000', '$50,000 - $100,000', '$100,000+']),
      }),
      field('multiple_choice', 'Timeline', {
        required: true,
        options: options(['Immediately', 'Within 2 weeks', 'Within a month', 'Just exploring']),
      }),
      field('long_text', 'What challenge are you trying to solve?', { placeholder: 'Tell us about your biggest pain point...' }),
    ],
  },
  {
    id: 'consultation',
    name: 'Consultation Booking',
    description: 'Collect contact info + service interest + availability. Great for service businesses.',
    icon: 'Calendar',
    category: 'Basic',
    branding: { primary_color: '#059669', button_text: 'Book Consultation' },
    settings: {},
    fields: [
      field('short_text', 'Full Name', { required: true }),
      field('email', 'Email Address', { required: true }),
      field('phone', 'Phone Number', { required: true }),
      field('page_break', 'About Your Needs'),
      field('dropdown', 'Service Interested In', {
        required: true,
        options: options(['Strategy Consultation', 'Implementation', 'Audit / Review', 'Training', 'Other']),
      }),
      field('dropdown', 'Preferred Time', {
        options: options(['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)']),
      }),
      field('long_text', 'Anything else we should know?', { placeholder: 'Tell us more...' }),
    ],
  },
  {
    id: 'lead-magnet',
    name: 'Lead Magnet / Download',
    description: 'Minimal friction — name and email only. Perfect for gated content and free resources.',
    icon: 'Download',
    category: 'Basic',
    branding: { primary_color: '#7c3aed', button_text: 'Get Free Access' },
    settings: {},
    fields: [
      field('short_text', 'First Name', { required: true, placeholder: 'Your first name' }),
      field('email', 'Email Address', { required: true, placeholder: 'you@example.com' }),
      field('checkbox', 'I agree to receive emails', { placeholder: 'Yes, send me updates and resources' }),
    ],
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Collect attendee info with job title and dietary preferences. Works for webinars and in-person events.',
    icon: 'Ticket',
    category: 'Basic',
    branding: { primary_color: '#dc2626', button_text: 'Register Now' },
    settings: {},
    fields: [
      field('short_text', 'First Name', { required: true }),
      field('short_text', 'Last Name', { required: true }),
      field('email', 'Email Address', { required: true }),
      field('short_text', 'Company', { placeholder: 'Your company name' }),
      field('short_text', 'Job Title', { placeholder: 'Your role' }),
      field('page_break', 'Event Details'),
      field('multiple_choice', 'Attendance Type', {
        options: options(['In Person', 'Virtual', 'Both Days']),
      }),
      field('long_text', 'Questions for the speakers?', { placeholder: 'Optional' }),
    ],
  },
]

export function getTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id)
}
