'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle, Loader2 } from 'lucide-react'
import type { Form, FormField } from '@/types'

export default function PublicFormPage() {
  const params = useParams()
  const slug = params.slug as string

  const [form, setForm] = useState<Form | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thankYou, setThankYou] = useState({ title: '', message: '', redirect_url: '' as string | null })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchForm()
  }, [slug])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return

    setSubmitting(true)
    try {
      // Build labeled data using field labels as keys
      const labeledData: Record<string, string> = {}
      for (const field of form.fields) {
        const value = formData[field.id]
        if (value) {
          labeledData[field.label] = value
        }
      }

      // Capture UTM params from URL
      const urlParams = new URLSearchParams(window.location.search)
      const utm = {
        source: urlParams.get('utm_source'),
        medium: urlParams.get('utm_medium'),
        campaign: urlParams.get('utm_campaign'),
        term: urlParams.get('utm_term'),
        content: urlParams.get('utm_content'),
      }

      const res = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: labeledData, utm }),
      })

      if (res.ok) {
        const data = await res.json()
        setThankYou(data.thank_you)
        setSubmitted(true)

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
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="py-8 px-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{form.name}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot */}
            <input
              name="_honeypot"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {form.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderFormField(field, formData[field.id] || '', (v) => updateField(field.id, v))}
              </div>
            ))}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function renderFormField(
  field: FormField,
  value: string,
  onChange: (value: string) => void
) {
  switch (field.type) {
    case 'short_text':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          required={field.required}
        />
      )
    case 'long_text':
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          required={field.required}
          rows={3}
        />
      )
    case 'email':
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'email@example.com'}
          required={field.required}
        />
      )
    case 'phone':
      return (
        <Input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || '(555) 000-0000'}
          required={field.required}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || '0'}
          required={field.required}
        />
      )
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {(field.options || []).map((option) => (
            <label key={option.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="h-4 w-4"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )
    case 'dropdown':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
          />
          <span className="text-sm">{field.placeholder || 'I agree'}</span>
        </div>
      )
    default:
      return null
  }
}
