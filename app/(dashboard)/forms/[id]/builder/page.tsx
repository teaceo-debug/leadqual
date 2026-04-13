'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Canvas } from '@/components/form-builder/canvas'
import { FieldPalette } from '@/components/form-builder/field-palette'
import { FieldEditor } from '@/components/form-builder/field-editor'
import { FormPreview } from '@/components/form-builder/form-preview'
import { BrandingEditor } from '@/components/form-builder/branding-editor'
import {
  ArrowLeft,
  Save,
  Eye,
  Globe,
  ExternalLink,
  Copy,
  Check,
  BarChart3,
  Paintbrush,
} from 'lucide-react'
import type { Form, FormField, FormFieldType, FormBranding, FormFacebookSettings } from '@/types'

const defaultFieldLabels: Record<FormFieldType, string> = {
  short_text: 'Text Field',
  long_text: 'Long Text',
  email: 'Email Address',
  phone: 'Phone Number',
  number: 'Number',
  multiple_choice: 'Multiple Choice',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  page_break: 'Page Break',
}

export default function FormBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string

  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [formName, setFormName] = useState('')
  const [branding, setBranding] = useState<FormBranding>({})
  const [facebook, setFacebook] = useState<FormFacebookSettings>({})
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('build')
  const [rightPanel, setRightPanel] = useState<'field' | 'branding' | 'facebook'>('field')

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null

  useEffect(() => {
    fetchForm()
  }, [formId])

  async function fetchForm() {
    try {
      const res = await fetch(`/api/forms/${formId}`)
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
        setFields(data.form.fields || [])
        setFormName(data.form.name)
        setBranding(data.form.branding || {})
        setFacebook(data.form.facebook || {})
      } else {
        router.push('/forms')
      }
    } catch (error) {
      console.error('Error fetching form:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveForm = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, fields, branding, facebook }),
      })
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error saving form:', error)
    } finally {
      setSaving(false)
    }
  }, [formId, formName, fields, branding, facebook])

  async function publishForm() {
    setPublishing(true)
    try {
      const newStatus = form?.status === 'published' ? 'draft' : 'published'
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, fields, branding, facebook, status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setForm(data.form)
      }
    } catch (error) {
      console.error('Error publishing form:', error)
    } finally {
      setPublishing(false)
    }
  }

  function addField(type: FormFieldType) {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: defaultFieldLabels[type],
      placeholder: '',
      required: false,
      options:
        type === 'multiple_choice' || type === 'dropdown'
          ? [
              { id: crypto.randomUUID(), label: 'Option 1', value: crypto.randomUUID() },
              { id: crypto.randomUUID(), label: 'Option 2', value: crypto.randomUUID() },
            ]
          : undefined,
    }
    setFields([...fields, newField])
    setSelectedFieldId(newField.id)
    setRightPanel('field')
  }

  function updateField(updated: FormField) {
    setFields(fields.map((f) => (f.id === updated.id ? updated : f)))
  }

  function deleteField(id: string) {
    setFields(fields.filter((f) => f.id !== id))
    if (selectedFieldId === id) setSelectedFieldId(null)
  }

  function copyFormUrl() {
    if (!form) return
    const url = `${window.location.origin}/f/${form.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-3 h-96" />
          <Skeleton className="col-span-6 h-96" />
          <Skeleton className="col-span-3 h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/forms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="max-w-xs font-semibold border-transparent hover:border-input focus:border-input"
          />
          <Badge variant={form?.status === 'published' ? 'default' : 'secondary'}>
            {form?.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/forms/${formId}/analytics`)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          {form?.status === 'published' && (
            <>
              <Button variant="outline" size="sm" onClick={copyFormUrl}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/f/${form.slug}`, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={saveForm} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </Button>
          <Button size="sm" onClick={publishForm} disabled={publishing || fields.length === 0}>
            <Globe className="mr-2 h-4 w-4" />
            {publishing
              ? 'Processing...'
              : form?.status === 'published'
                ? 'Unpublish'
                : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Builder */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left panel - Field palette */}
            <div className="col-span-3">
              <div className="sticky top-4 rounded-lg border bg-card p-4">
                <FieldPalette onAddField={addField} />
              </div>
            </div>

            {/* Center - Canvas */}
            <div className="col-span-6">
              <div className="rounded-lg border bg-card p-4 min-h-[400px]">
                <Canvas
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onFieldsChange={setFields}
                  onSelectField={(id) => {
                    setSelectedFieldId(id)
                    setRightPanel('field')
                  }}
                  onDeleteField={deleteField}
                />
              </div>
            </div>

            {/* Right panel */}
            <div className="col-span-3">
              <div className="sticky top-4 space-y-2">
                {/* Panel tabs */}
                <div className="flex gap-1 rounded-lg border bg-card p-1">
                  <Button
                    variant={rightPanel === 'field' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setRightPanel('field')}
                  >
                    Field
                  </Button>
                  <Button
                    variant={rightPanel === 'branding' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setRightPanel('branding')}
                  >
                    <Paintbrush className="mr-1 h-3 w-3" />
                    Brand
                  </Button>
                  <Button
                    variant={rightPanel === 'facebook' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setRightPanel('facebook')}
                  >
                    FB Pixel
                  </Button>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  {rightPanel === 'field' && (
                    selectedField ? (
                      <FieldEditor
                        field={selectedField}
                        allFields={fields}
                        onChange={updateField}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm text-center">
                        <p>Select a field to edit its settings</p>
                      </div>
                    )
                  )}

                  {rightPanel === 'branding' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                        Branding
                      </h3>
                      <BrandingEditor branding={branding} onChange={setBranding} />
                    </div>
                  )}

                  {rightPanel === 'facebook' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                        Facebook Pixel
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Pixel ID</label>
                          <Input
                            value={facebook.pixel_id || ''}
                            onChange={(e) => setFacebook({ ...facebook, pixel_id: e.target.value })}
                            placeholder="123456789012345"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Conversions API Access Token</label>
                          <Input
                            type="password"
                            value={facebook.access_token || ''}
                            onChange={(e) => setFacebook({ ...facebook, access_token: e.target.value })}
                            placeholder="EAAx..."
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Server-side events for better ad optimization
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium">Test Event Code (optional)</label>
                          <Input
                            value={facebook.test_event_code || ''}
                            onChange={(e) => setFacebook({ ...facebook, test_event_code: e.target.value })}
                            placeholder="TEST12345"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            For testing in Facebook Events Manager
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div
            className="rounded-lg border p-8"
            style={{
              backgroundColor: branding.background_color || undefined,
              fontFamily: branding.font_family || undefined,
            }}
          >
            <FormPreview fields={fields} formName={formName} branding={branding} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
