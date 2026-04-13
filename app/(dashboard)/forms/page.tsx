'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  FileText,
  MoreVertical,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  UserPlus,
  Shield,
  Calendar,
  Download,
  Ticket,
  Sparkles,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FORM_TEMPLATES } from '@/lib/form-templates'
import type { Form } from '@/types'

const templateIcons: Record<string, React.ElementType> = {
  UserPlus, Shield, Calendar, Download, Ticket,
}

export default function FormsPage() {
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    fetchForms()
  }, [])

  async function fetchForms() {
    try {
      const res = await fetch('/api/forms')
      if (res.ok) {
        const data = await res.json()
        setForms(data.forms || [])
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createFromTemplate(templateId?: string) {
    setCreating(true)
    setShowTemplates(false)
    try {
      const template = templateId
        ? FORM_TEMPLATES.find((t) => t.id === templateId)
        : null

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template ? template.name : 'Untitled Form',
          description: template?.description || null,
          fields: template?.fields || [],
          settings: template?.settings || {},
          branding: template?.branding || {},
        }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/forms/${data.form.id}/builder`)
      }
    } catch (error) {
      console.error('Error creating form:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteForm(id: string) {
    if (!window.confirm('Are you sure you want to delete this form? All submissions will also be deleted.')) {
      return
    }
    try {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setForms(forms.filter((f) => f.id !== id))
      }
    } catch (error) {
      console.error('Error deleting form:', error)
    }
  }

  async function duplicateForm(form: Form) {
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.name} (Copy)`,
          fields: form.fields,
          settings: form.settings,
        }),
      })
      if (res.ok) {
        fetchForms()
      }
    } catch (error) {
      console.error('Error duplicating form:', error)
    }
  }

  const statusColor = {
    draft: 'secondary',
    published: 'default',
    archived: 'outline',
  } as const

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground">
            Build and manage your lead capture forms
          </p>
        </div>
        <Button onClick={() => setShowTemplates(true)} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? 'Creating...' : 'New Form'}
        </Button>
      </div>

      {/* Template Picker Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2 mt-2">
            {/* Blank form option */}
            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => createFromTemplate()}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Blank Form</p>
                  <p className="text-xs text-muted-foreground">Start from scratch</p>
                </div>
              </CardContent>
            </Card>

            {/* Templates */}
            {FORM_TEMPLATES.map((t) => {
              const Icon = templateIcons[t.icon] || Sparkles
              return (
                <Card
                  key={t.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => createFromTemplate(t.id)}
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: (t.branding.primary_color || '#2563EB') + '18' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: t.branding.primary_color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {forms.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            Create your first form to start capturing and qualifying leads
            automatically.
          </p>
          <Button onClick={() => setShowTemplates(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Form
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card
              key={form.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/forms/${form.id}/builder`)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base truncate">
                    {form.name}
                  </CardTitle>
                  {form.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {form.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/forms/${form.id}/builder`)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {form.status === 'published' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/f/${form.slug}`, '_blank')
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Live
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicateForm(form)
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteForm(form.id)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColor[form.status]}>
                      {form.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {form.submission_count} submission{form.submission_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
