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
import {
  ArrowLeft,
  Save,
  Eye,
  Globe,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import type { Form, FormField, FormFieldType } from '@/types'

const defaultFieldLabels: Record<FormFieldType, string> = {
  short_text: 'Text Field',
  long_text: 'Long Text',
  email: 'Email Address',
  phone: 'Phone Number',
  number: 'Number',
  multiple_choice: 'Multiple Choice',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
}

export default function FormBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string

  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [formName, setFormName] = useState('')
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('build')

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
        body: JSON.stringify({ name: formName, fields }),
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
  }, [formId, formName, fields])

  async function publishForm() {
    setPublishing(true)
    try {
      const newStatus = form?.status === 'published' ? 'draft' : 'published'
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, fields, status: newStatus }),
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
              { id: crypto.randomUUID(), label: 'Option 1', value: 'option_1' },
              { id: crypto.randomUUID(), label: 'Option 2', value: 'option_2' },
            ]
          : undefined,
    }
    setFields([...fields, newField])
    setSelectedFieldId(newField.id)
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
                  onSelectField={setSelectedFieldId}
                  onDeleteField={deleteField}
                />
              </div>
            </div>

            {/* Right panel - Field editor */}
            <div className="col-span-3">
              <div className="sticky top-4 rounded-lg border bg-card p-4">
                {selectedField ? (
                  <FieldEditor
                    field={selectedField}
                    onChange={updateField}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm text-center">
                    <p>Select a field to edit its settings</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="rounded-lg border bg-card p-8">
            <FormPreview fields={fields} formName={formName} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
