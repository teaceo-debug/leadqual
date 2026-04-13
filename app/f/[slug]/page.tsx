'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { DebugConsole } from '@/components/form-builder/debug-console'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Form, FormField, FormBranding, FormFieldCondition } from '@/types'

// Evaluate if a field's conditions are met
function evaluateConditions(
  conditions: FormFieldCondition[] | undefined,
  formData: Record<string, string>
): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every((c) => {
    const val = formData[c.field_id] || ''
    switch (c.operator) {
      case 'equals': return val === c.value
      case 'not_equals': return val !== c.value
      case 'contains': return val.toLowerCase().includes((c.value || '').toLowerCase())
      case 'not_empty': return val.trim().length > 0
      case 'is_empty': return val.trim().length === 0
      default: return true
    }
  })
}

// Split fields into pages by page_break
function splitIntoPages(fields: FormField[]): FormField[][] {
  const pages: FormField[][] = [[]]
  for (const field of fields) {
    if (field.type === 'page_break') {
      pages.push([])
    } else {
      pages[pages.length - 1].push(field)
    }
  }
  return pages.filter((p) => p.length > 0)
}

export default function PublicFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const showDebug = searchParams.get('debug') === '1'

  const [form, setForm] = useState<Form | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thankYou, setThankYou] = useState({ title: '', message: '', redirect_url: '' as string | null })
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [tracking, setTracking] = useState<Record<string, string>>({})
  const [debugLogs, setDebugLogs] = useState<{ time: string; source: 'system' | 'client' | 'server' | 'gate' | 'pixel' | 'error'; event: string; detail: string }[]>([])
  const [debugOpen, setDebugOpen] = useState(showDebug)
  const [gateStatus, setGateStatus] = useState<'pending' | 'qualified' | 'disqualified' | null>(null)

  const addLog = useCallback((source: 'system' | 'client' | 'server' | 'gate' | 'pixel' | 'error', event: string, detail: string) => {
    setDebugLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), source, event, detail }])
  }, [])

  const pages = useMemo(() => form ? splitIntoPages(form.fields) : [[]], [form])
  const isMultiStep = pages.length > 1
  const isLastPage = currentPage >= pages.length - 1

  // Get visible fields on current page (respecting conditions)
  const visibleFields = useMemo(() => {
    if (!pages[currentPage]) return []
    return pages[currentPage].filter((f) => evaluateConditions(f.conditions, formData))
  }, [pages, currentPage, formData])

  const branding: FormBranding = (form?.branding as FormBranding) || {}

  useEffect(() => {
    fetchForm()
  }, [slug])

  // Capture all tracking identifiers on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : ''
    }

    const fbclid = params.get('fbclid') || ''
    const fbp = getCookie('_fbp')
    let fbc = getCookie('_fbc')
    if (!fbc && fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`
    }

    const t: Record<string, string> = {
      fbclid, fbp, fbc,
      user_agent: navigator.userAgent,
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
    }

    // Fetch IP + geo
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => {
        t.ip = d.ip || ''
        t.country_code = (d.country_code || '').toLowerCase()
        t.zip_code = d.postal || ''
        setTracking({ ...t })
      })
      .catch(() => {
        fetch('https://api.ipify.org?format=json')
          .then((r) => r.json())
          .then((d) => { t.ip = d.ip || ''; setTracking({ ...t }) })
          .catch(() => setTracking(t))
      })

    setTracking(t)
    addLog('system', 'Identifiers', `fbclid:${fbclid ? 'yes' : 'no'} fbp:${fbp ? 'yes' : 'no'} fbc:${fbc ? 'yes' : 'no'} utm:${t.utm_source || 'none'}`)
  }, [addLog])

  // Track view and load Facebook Pixel
  useEffect(() => {
    if (!form) return

    // Track view
    fetch(`/api/forms/${form.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utm: {
          source: tracking.utm_source,
          medium: tracking.utm_medium,
          campaign: tracking.utm_campaign,
        },
      }),
    }).catch(() => {})
    addLog('system', 'PageView', 'View tracked via server API')

    // Load Facebook Pixel
    const fb = form.facebook as { pixel_id?: string } | undefined
    if (fb?.pixel_id) {
      const safePixelId = String(fb.pixel_id).replace(/\D/g, '')
      if (safePixelId) {
        const script = document.createElement('script')
        script.innerHTML = `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${safePixelId}');
          fbq('track','PageView');
        `
        document.head.appendChild(script)
        addLog('client', 'Pixel Init', `Pixel ID: ${safePixelId}`)
        addLog('client', 'PageView', 'Client-side PageView fired')
      }
    } else {
      addLog('system', 'No Pixel', 'Facebook Pixel not configured for this form')
    }
  }, [form])

  async function fetchForm() {
    try {
      const res = await fetch(`/api/forms/public/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
      } else {
        setError('Form not found')
      }
    } catch {
      setError('Failed to load form')
    } finally {
      setLoading(false)
    }
  }

  function updateField(fieldId: string, value: string) {
    setFormData({ ...formData, [fieldId]: value })
  }

  function nextPage() {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
      window.scrollTo(0, 0)
    }
  }

  function prevPage() {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      window.scrollTo(0, 0)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return

    // If multi-step and not last page, go to next page
    if (isMultiStep && !isLastPage) {
      nextPage()
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      // Build labeled data using field labels as keys
      const labeledData: Record<string, string> = {}
      for (const field of form.fields) {
        if (field.type === 'page_break') continue
        const value = formData[field.id]
        if (value && evaluateConditions(field.conditions, formData)) {
          labeledData[field.label] = value
        }
      }

      // UTM from tracking state
      const utm = {
        source: tracking.utm_source,
        medium: tracking.utm_medium,
        campaign: tracking.utm_campaign,
        term: tracking.utm_term,
        content: tracking.utm_content,
      }

      // Read honeypot
      const formEl = e.target as HTMLFormElement
      const honeypotValue = (formEl.elements.namedItem('_honeypot') as HTMLInputElement)?.value || ''

      const res = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: labeledData,
          utm,
          _honeypot: honeypotValue,
          tracking: {
            fbclid: tracking.fbclid,
            fbp: tracking.fbp,
            fbc: tracking.fbc,
            ip: tracking.ip,
            country_code: tracking.country_code,
            zip_code: tracking.zip_code,
          },
        }),
      })

      addLog('client', 'Submitting', `POST /api/forms/${form.id}/submit`)

      if (res.ok) {
        const data = await res.json()
        setThankYou(data.thank_you)
        setSubmitted(true)
        setGateStatus('qualified')
        addLog('server', 'Submitted', `ID: ${data.submission_id} | Score: ${data.lead_score || 'pending'}`)

        // Fire Facebook Lead event (with score for value optimization)
        if (typeof window !== 'undefined' && (window as any).fbq) {
          const eventId = data.submission_id
          ;(window as any).fbq('track', 'Lead', {
            content_name: 'Form_Submission',
            value: data.lead_score || 0,
            currency: 'USD',
          }, { eventID: eventId })
          addLog('client', 'Lead (dedup)', `event_id=${eventId} value=${data.lead_score || 0}`)
        }
        addLog('pixel', 'SEED UPDATED', 'Lead entered seed audience. Lookalike will learn this profile.')

        if (data.thank_you.redirect_url) {
          setTimeout(() => {
            window.location.href = data.thank_you.redirect_url
          }, 2000)
        }
      } else {
        setError('Failed to submit form. Please try again.')
      }
    } catch {
      setError('Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: branding.background_color }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: branding.background_color }}>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{ backgroundColor: branding.background_color, fontFamily: branding.font_family }}
      >
        <Card className="w-full max-w-md" style={{ borderRadius: branding.border_radius }}>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="h-16 w-16 mb-4" style={{ color: branding.primary_color || '#22c55e' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: branding.text_color }}>
              {thankYou.title || 'Thank you!'}
            </h2>
            <p className="text-muted-foreground">
              {thankYou.message || "We've received your submission."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!form) return null

  const progressPercent = isMultiStep
    ? Math.round(((currentPage + 1) / pages.length) * 100)
    : undefined

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: branding.background_color || '#f9fafb', fontFamily: branding.font_family }}
    >
      <Card className="w-full max-w-lg" style={{ borderRadius: branding.border_radius }}>
        <CardContent className="py-8 px-6">
          {branding.logo_url && (
            <div className="flex justify-center mb-4">
              <img src={branding.logo_url} alt="" className="h-10 object-contain" />
            </div>
          )}

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold" style={{ color: branding.text_color }}>
              {form.name}
            </h1>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
          </div>

          {isMultiStep && (
            <div className="mb-6 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {currentPage + 1} of {pages.length}</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress
                value={progressPercent}
                className="h-2"
                style={{ '--progress-color': branding.primary_color } as React.CSSProperties}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot */}
            <input
              name="_honeypot"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {visibleFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label style={{ color: branding.text_color }}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderFormField(field, formData[field.id] || '', (v) => updateField(field.id, v), branding)}
              </div>
            ))}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              {isMultiStep && currentPage > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={prevPage}
                  style={{ borderRadius: branding.border_radius }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}

              <Button
                type="submit"
                className="flex-1"
                disabled={submitting}
                style={{
                  backgroundColor: branding.primary_color,
                  borderRadius: branding.border_radius,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : isMultiStep && !isLastPage ? (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  branding.button_text || 'Submit'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Debug Console */}
      {debugOpen && (
        <DebugConsole
          logs={debugLogs}
          tracking={tracking}
          formData={formData}
          gateStatus={gateStatus}
          onClose={() => setDebugOpen(false)}
        />
      )}
    </div>
  )
}

function renderFormField(
  field: FormField,
  value: string,
  onChange: (value: string) => void,
  branding: FormBranding
) {
  const inputStyle = { borderRadius: branding.border_radius }

  switch (field.type) {
    case 'short_text':
      return (
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''} required={field.required} style={inputStyle} />
      )
    case 'long_text':
      return (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''} required={field.required} rows={3} style={inputStyle} />
      )
    case 'email':
      return (
        <Input type="email" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'email@example.com'} required={field.required} style={inputStyle} />
      )
    case 'phone':
      return (
        <Input type="tel" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || '(555) 000-0000'} required={field.required} style={inputStyle} />
      )
    case 'number':
      return (
        <Input type="number" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || '0'} required={field.required} style={inputStyle} />
      )
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {(field.options || []).map((option) => (
            <label key={option.id} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={field.id} value={option.value}
                checked={value === option.value} onChange={() => onChange(option.value)} className="h-4 w-4"
                style={{ accentColor: branding.primary_color }} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )
    case 'dropdown':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger style={inputStyle}>
            <SelectValue placeholder={field.placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option.id} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox checked={value === 'true'} onCheckedChange={(c) => onChange(c ? 'true' : 'false')} />
          <span className="text-sm">{field.placeholder || 'I agree'}</span>
        </div>
      )
    default:
      return null
  }
}
