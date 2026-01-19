'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { COMPANY_SIZES, INDUSTRIES, BUDGET_RANGES, TIMELINES } from '@/lib/constants'
import { Loader2, CheckCircle } from 'lucide-react'

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company_name: string
  company_website: string
  company_size: string
  industry: string
  budget_range: string
  timeline: string
  challenge: string
}

export default function LeadFormPage() {
  const params = useParams()
  const orgId = params.orgId as string

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_name: '',
    company_website: '',
    company_size: '',
    industry: '',
    budget_range: '',
    timeline: '',
    challenge: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': orgId,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit form')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
            <p className="text-muted-foreground">
              We&apos;ve received your information and will be in touch soon.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Get in Touch</CardTitle>
          <CardDescription>
            Fill out the form below and we&apos;ll get back to you shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="job_title">Job title *</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleChange('job_title', e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Company Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_website">Company website</Label>
                <Input
                  id="company_website"
                  type="url"
                  placeholder="https://"
                  value={formData.company_website}
                  onChange={(e) => handleChange('company_website', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Company Size & Industry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_size">Company size *</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => handleChange('company_size', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleChange('industry', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_range">Budget range *</Label>
                <Select
                  value={formData.budget_range}
                  onValueChange={(value) => handleChange('budget_range', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map((budget) => (
                      <SelectItem key={budget} value={budget}>
                        {budget}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline *</Label>
                <Select
                  value={formData.timeline}
                  onValueChange={(value) => handleChange('timeline', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINES.map((timeline) => (
                      <SelectItem key={timeline} value={timeline}>
                        {timeline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Challenge */}
            <div className="space-y-2">
              <Label htmlFor="challenge">What&apos;s your biggest challenge?</Label>
              <Textarea
                id="challenge"
                placeholder="Tell us about the problems you're trying to solve..."
                value={formData.challenge}
                onChange={(e) => handleChange('challenge', e.target.value)}
                disabled={loading}
                rows={4}
              />
            </div>

            {/* Honeypot field */}
            <input
              type="text"
              name="website"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
