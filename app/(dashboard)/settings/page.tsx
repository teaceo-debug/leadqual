'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Copy, Check, ExternalLink } from 'lucide-react'
import type { Organization } from '@/types'

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copiedApiKey, setCopiedApiKey] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [thankYouTitle, setThankYouTitle] = useState('')
  const [thankYouMessage, setThankYouMessage] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (response.ok) {
        setOrganization(data.organization)
        setName(data.organization.name)
        setLogoUrl(data.organization.logo_url || '')
        setPrimaryColor(data.organization.primary_color || '#2563eb')
        setThankYouTitle(data.organization.thank_you_title || '')
        setThankYouMessage(data.organization.thank_you_message || '')
        setRedirectUrl(data.organization.redirect_url || '')
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
        body: JSON.stringify({
          name,
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          thank_you_title: thankYouTitle,
          thank_you_message: thankYouMessage,
          redirect_url: redirectUrl || null,
        }),
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

  const handleCopyApiKey = async () => {
    if (organization) {
      await navigator.clipboard.writeText(organization.public_api_key)
      setCopiedApiKey(true)
      setTimeout(() => setCopiedApiKey(false), 2000)
    }
  }

  const handleCopyEmbed = async () => {
    if (organization) {
      const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadqual.io'}/embed.js" data-org="${organization.id}"></script>`
      await navigator.clipboard.writeText(embedCode)
      setCopiedEmbed(true)
      setTimeout(() => setCopiedEmbed(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!organization) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 py-8">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-destructive">Failed to load settings</p>
        </CardContent>
      </Card>
    )
  }

  const formUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadqual.io'}/form/${organization.id}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your organization and lead form
        </p>
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
            <p className="text-sm text-success">Settings saved successfully</p>
          </CardContent>
        </Card>
      )}

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Basic organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Company"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://yourcompany.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Used on your lead capture form
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2563eb"
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Form Customization</CardTitle>
          <CardDescription>
            Customize the thank-you experience after form submission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thankYouTitle">Thank You Title</Label>
            <Input
              id="thankYouTitle"
              value={thankYouTitle}
              onChange={(e) => setThankYouTitle(e.target.value)}
              placeholder="Thank you for your interest!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thankYouMessage">Thank You Message</Label>
            <Textarea
              id="thankYouMessage"
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              placeholder="We'll be in touch soon."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
            <Input
              id="redirectUrl"
              type="url"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yourcompany.com/thank-you"
            />
            <p className="text-xs text-muted-foreground">
              If set, users will be redirected here after submission
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Integration</CardTitle>
          <CardDescription>
            Embed the lead form on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Public API Key</Label>
            <div className="flex gap-2">
              <Input
                value={organization.public_api_key}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyApiKey}
              >
                {copiedApiKey ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Hosted Form URL</Label>
            <div className="flex gap-2">
              <Input
                value={formUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                asChild
              >
                <a href={formUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct link to your lead capture form
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Embed Code</Label>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">
                {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadqual.io'}/embed.js" data-org="${organization.id}"></script>`}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyEmbed}
              >
                {copiedEmbed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this script to any page to embed your lead form
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
