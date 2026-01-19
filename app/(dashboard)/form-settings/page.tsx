'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Check, Copy, ExternalLink, Palette, FileText, Link2 } from 'lucide-react'

interface Organization {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
  thank_you_title: string | null
  thank_you_message: string | null
  redirect_url: string | null
}

export default function FormSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    primary_color: '#3b82f6',
    logo_url: '',
    thank_you_title: 'Thank you!',
    thank_you_message: "We've received your information and will be in touch soon.",
    redirect_url: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (response.ok) {
        setOrganization(data.organization)
        setFormData({
          primary_color: data.organization.primary_color || '#3b82f6',
          logo_url: data.organization.logo_url || '',
          thank_you_title: data.organization.thank_you_title || 'Thank you!',
          thank_you_message: data.organization.thank_you_message || "We've received your information and will be in touch soon.",
          redirect_url: data.organization.redirect_url || '',
        })
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setOrganization(data.organization)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyFormUrl = async () => {
    if (!organization) return
    const formUrl = `${window.location.origin}/form/${organization.id}`
    await navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenForm = () => {
    if (!organization) return
    const formUrl = `${window.location.origin}/form/${organization.id}`
    window.open(formUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Form Settings</h1>
          <p className="text-muted-foreground">
            Customize your lead capture form appearance and behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyFormUrl}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Form URL
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleOpenForm}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview Form
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-success bg-success/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-5 w-5 text-success" />
            <p className="text-sm text-success">Settings saved successfully!</p>
          </CardContent>
        </Card>
      )}

      {/* Form URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Form URL
          </CardTitle>
          <CardDescription>
            Share this URL with your audience to capture leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={organization ? `${window.location.origin}/form/${organization.id}` : ''}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={handleCopyFormUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={handleOpenForm}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primary_color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#3b82f6"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for buttons and accent elements
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                URL to your company logo (optional)
              </p>
            </div>

            {/* Color Preview */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Preview</p>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Submit Button Preview
                </Button>
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: formData.primary_color }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thank You Page Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Thank You Page
            </CardTitle>
            <CardDescription>
              Customize what users see after submitting the form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="thank_you_title">Title</Label>
              <Input
                id="thank_you_title"
                value={formData.thank_you_title}
                onChange={(e) => setFormData({ ...formData, thank_you_title: e.target.value })}
                placeholder="Thank you!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thank_you_message">Message</Label>
              <Textarea
                id="thank_you_message"
                value={formData.thank_you_message}
                onChange={(e) => setFormData({ ...formData, thank_you_message: e.target.value })}
                placeholder="We've received your information and will be in touch soon."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect_url">Redirect URL (optional)</Label>
              <Input
                id="redirect_url"
                type="url"
                value={formData.redirect_url}
                onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                placeholder="https://example.com/thank-you"
              />
              <p className="text-xs text-muted-foreground">
                Redirect users to a custom page after submission
              </p>
            </div>

            {/* Thank You Preview */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Preview</p>
              <div className="rounded-lg border p-4 bg-muted/30 text-center">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                  style={{ backgroundColor: `${formData.primary_color}20` }}
                >
                  <Check
                    className="h-6 w-6"
                    style={{ color: formData.primary_color }}
                  />
                </div>
                <h3 className="font-semibold">{formData.thank_you_title || 'Thank you!'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.thank_you_message || "We've received your information."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
