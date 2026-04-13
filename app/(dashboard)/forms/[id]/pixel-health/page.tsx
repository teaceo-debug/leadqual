'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Check, X, AlertTriangle, Zap, Shield } from 'lucide-react'
import type { Form } from '@/types'

interface MatchKey {
  key: string
  label: string
  priority: 'high' | 'medium' | 'browser' | 'meta'
  description: string
  fieldNeeded: string
}

const MATCH_KEYS: MatchKey[] = [
  { key: 'em', label: 'Email (em)', priority: 'high', description: 'Hashed email address', fieldNeeded: 'Email field in form' },
  { key: 'ph', label: 'Phone (ph)', priority: 'high', description: 'Hashed phone number', fieldNeeded: 'Phone field in form' },
  { key: 'fn', label: 'First Name (fn)', priority: 'high', description: 'Hashed first name', fieldNeeded: 'First Name field in form' },
  { key: 'ln', label: 'Last Name (ln)', priority: 'high', description: 'Hashed last name', fieldNeeded: 'Last Name field in form' },
  { key: 'zp', label: 'Zip Code (zp)', priority: 'medium', description: 'Hashed postal code', fieldNeeded: 'Auto-captured from IP geolocation' },
  { key: 'country', label: 'Country (ct)', priority: 'medium', description: 'Hashed country code', fieldNeeded: 'Auto-captured from IP geolocation' },
  { key: 'client_ip', label: 'IP Address', priority: 'browser', description: 'Client IP for cross-device matching', fieldNeeded: 'Auto-captured from request headers' },
  { key: 'client_ua', label: 'User Agent', priority: 'browser', description: 'Browser/device fingerprint', fieldNeeded: 'Auto-captured from request headers' },
  { key: 'fbp', label: 'Browser ID (_fbp)', priority: 'meta', description: 'Meta Pixel browser cookie', fieldNeeded: 'Facebook Pixel must be configured' },
  { key: 'fbc', label: 'Click ID (_fbc)', priority: 'meta', description: 'Facebook click identifier', fieldNeeded: 'User must arrive via Facebook ad' },
]

const priorityColors = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  browser: 'text-blue-500',
  meta: 'text-purple-500',
}

const priorityLabels = {
  high: 'High Priority',
  medium: 'Medium Priority',
  browser: 'Device Signal',
  meta: 'Meta Cookie',
}

function estimateEMQ(form: Form): { score: number; available: string[]; missing: string[]; recommendations: string[] } {
  const fields = form.fields || []
  const fb = (form.facebook || {}) as { pixel_id?: string }
  const fieldLabels = fields.map((f) => f.label.toLowerCase())
  const fieldTypes = fields.map((f) => f.type)

  const available: string[] = []
  const missing: string[] = []
  const recommendations: string[] = []

  // Email
  if (fieldTypes.includes('email') || fieldLabels.some((l) => l.includes('email'))) {
    available.push('em')
  } else {
    missing.push('em')
    recommendations.push('Add an Email field — this is the #1 match key for EMQ.')
  }

  // Phone
  if (fieldTypes.includes('phone') || fieldLabels.some((l) => l.includes('phone'))) {
    available.push('ph')
  } else {
    missing.push('ph')
    recommendations.push('Add a Phone field — improves match rate by ~15%.')
  }

  // First Name
  if (fieldLabels.some((l) => l.includes('first') || l === 'name' || l === 'full name')) {
    available.push('fn')
  } else {
    missing.push('fn')
    recommendations.push('Add a First Name field for better identity matching.')
  }

  // Last Name
  if (fieldLabels.some((l) => l.includes('last'))) {
    available.push('ln')
  } else {
    missing.push('ln')
    recommendations.push('Add a Last Name field — significantly improves match quality.')
  }

  // Geo (auto-captured)
  available.push('zp', 'country')

  // Browser signals (always available)
  available.push('client_ip', 'client_ua')

  // Meta cookies
  if (fb?.pixel_id) {
    available.push('fbp')
    available.push('fbc') // Available if user came from ad
  } else {
    missing.push('fbp')
    missing.push('fbc')
    recommendations.push('Configure Facebook Pixel ID to capture _fbp and _fbc cookies — highest match rate signals.')
  }

  // Score: each key is worth ~1 point, max 10
  const score = Math.min(Math.round((available.length / 10) * 10), 10)

  return { score, available, missing, recommendations }
}

export default function PixelHealthPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/forms/${formId}`)
      .then((r) => r.json())
      .then((d) => setForm(d.form))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [formId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 col-span-2" />
        </div>
      </div>
    )
  }

  if (!form) return null

  const emq = estimateEMQ(form)
  const fb = (form.facebook || {}) as { pixel_id?: string; access_token?: string }
  const hasPixel = !!fb.pixel_id
  const hasCAPI = !!fb.access_token

  const scoreColor = emq.score >= 8 ? 'text-green-500' : emq.score >= 5 ? 'text-amber-500' : 'text-red-500'
  const scoreLabel = emq.score >= 8 ? 'Excellent' : emq.score >= 5 ? 'Good' : 'Needs Improvement'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/forms/${formId}/builder`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pixel Health</h1>
          <p className="text-muted-foreground text-sm">{form.name}</p>
        </div>
      </div>

      {/* Top Row: EMQ Score + Connection Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* EMQ Score */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Estimated EMQ Score</p>
            <p className={`text-5xl font-bold ${scoreColor}`}>{emq.score}</p>
            <p className="text-xs text-muted-foreground mt-1">out of 10</p>
            <Badge variant={emq.score >= 8 ? 'default' : emq.score >= 5 ? 'secondary' : 'destructive'} className="mt-3">
              {scoreLabel}
            </Badge>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${hasPixel ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm">Facebook Pixel (Client-side)</span>
              </div>
              <Badge variant={hasPixel ? 'default' : 'destructive'}>
                {hasPixel ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={`h-4 w-4 ${hasCAPI ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm">Conversions API (Server-side)</span>
              </div>
              <Badge variant={hasCAPI ? 'default' : 'destructive'}>
                {hasCAPI ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-sm">Score Feedback Loop</span>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-sm">Purchase CAPI on Conversion</span>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Keys Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match Keys ({emq.available.length}/10)</CardTitle>
          <p className="text-xs text-muted-foreground">
            More match keys = higher EMQ = better Lookalike audiences. Facebook uses these to match events to real user profiles.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MATCH_KEYS.map((mk) => {
              const isAvailable = emq.available.includes(mk.key)
              return (
                <div key={mk.key} className="flex items-center gap-3 py-2 border-b last:border-0">
                  {isAvailable ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{mk.label}</span>
                      <span className={`text-[10px] ${priorityColors[mk.priority]}`}>
                        {priorityLabels[mk.priority]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{mk.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 max-w-[180px] text-right">
                    {isAvailable ? 'Sending' : mk.fieldNeeded}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {emq.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {emq.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-bold text-amber-500 mt-0.5">{i + 1}</span>
                <p className="text-sm">{rec}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Event Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
            <Badge variant="outline">Ad Click</Badge>
            <span>→</span>
            <Badge variant="outline">PageView</Badge>
            <span>→</span>
            <Badge variant="outline">Form Submit</Badge>
            <span>→</span>
            <Badge variant={hasCAPI ? 'default' : 'destructive'}>CAPI Lead (score={'{score}'})</Badge>
            <span>+</span>
            <Badge variant={hasPixel ? 'default' : 'destructive'}>Pixel Lead (dedup)</Badge>
            <span>→</span>
            <Badge variant="outline">AI Qualify</Badge>
            <span>→</span>
            <Badge variant="default">Convert → Purchase CAPI</Badge>
            <span>→</span>
            <Badge variant="secondary">Lookalike Learns</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
