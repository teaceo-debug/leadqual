'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScoreGauge } from '@/components/leads/score-gauge'
import { OutcomeButtons } from '@/components/leads/outcome-buttons'
import { LeadEnrichments } from '@/components/leads/lead-enrichments'
import { formatRelativeDate, formatAbsoluteDate, getLabelColor } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { LEAD_STATUSES } from '@/lib/constants'
import {
  Mail,
  Phone,
  Building2,
  Globe,
  Users,
  Briefcase,
  DollarSign,
  Clock,
  RefreshCw,
  ExternalLink,
  Target,
} from 'lucide-react'
import type { Lead } from '@/types'

interface LeadDetailPanelProps {
  lead: Lead | null
  onClose: () => void
  onUpdate: (leadId: string, updates: Partial<Lead>) => void
}

export function LeadDetailPanel({ lead, onClose, onUpdate }: LeadDetailPanelProps) {
  const [notes, setNotes] = useState(lead?.notes || '')
  const [saving, setSaving] = useState(false)
  const [requalifying, setRequalifying] = useState(false)

  if (!lead) return null

  const handleStatusChange = async (status: string) => {
    onUpdate(lead.id, { status: status as Lead['status'] })
  }

  const handleNotesBlur = async () => {
    if (notes !== lead.notes) {
      setSaving(true)
      onUpdate(lead.id, { notes })
      setSaving(false)
    }
  }

  const handleRequalify = async () => {
    setRequalifying(true)
    try {
      const response = await fetch(`/api/leads/${lead.id}/requalify`, { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to requalify')
      }
      toast({
        title: 'Lead re-qualified',
        description: 'The lead score has been recalculated.',
      })
    } catch (error) {
      console.error('Failed to requalify:', error)
      toast({
        title: 'Re-qualification failed',
        description: 'Could not requalify this lead. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRequalifying(false)
    }
  }

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                {(lead.first_name?.[0] || lead.email[0]).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {lead.first_name} {lead.last_name}
                </h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {lead.job_title || 'No job title'}
                </p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Score */}
          {lead.score !== null && lead.label && (
            <div className="flex flex-col items-center p-6 rounded-lg bg-muted/50">
              <ScoreGauge score={lead.score} size="lg" showLabel />
              <Badge className={`mt-3 ${getLabelColor(lead.label)}`}>
                {lead.label.toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Contact
            </h3>
            <div className="space-y-2">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 text-sm hover:text-primary"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                {lead.email}
              </a>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {lead.phone}
                </a>
              )}
            </div>
          </div>

          <Separator />

          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Company
            </h3>
            <div className="space-y-2">
              {lead.company_name && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {lead.company_name}
                </div>
              )}
              {lead.company_website && (
                <a
                  href={lead.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {lead.company_website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {lead.company_size && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {lead.company_size}
                </div>
              )}
              {lead.industry && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  {lead.industry}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Intent */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Intent
            </h3>
            <div className="space-y-2">
              {lead.budget_range && (
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  {lead.budget_range}
                </div>
              )}
              {lead.timeline && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {lead.timeline}
                </div>
              )}
            </div>
            {lead.challenge && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Challenge:</p>
                <p className="text-sm text-muted-foreground">{lead.challenge}</p>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {lead.reasoning && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  AI Analysis
                </h3>
                <p className="text-sm">{lead.reasoning}</p>
                {lead.breakdown && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Criteria Breakdown:</p>
                    {Object.entries(lead.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span>{key}</span>
                        <span className="text-muted-foreground">
                          {value.score}/100 - {value.note}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {lead.recommended_action && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-1">
                      Recommended Action
                    </p>
                    <p className="text-sm">{lead.recommended_action}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* AI Enrichments */}
          <Separator />
          <LeadEnrichments leadId={lead.id} />

          {/* Record Outcome */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4" />
              Record Outcome
            </h3>
            <OutcomeButtons
              leadId={lead.id}
              onOutcomeRecorded={(outcome) => {
                // Refresh lead data after outcome recorded
                const statusMap: Record<string, string> = {
                  converted: 'converted',
                  rejected: 'rejected',
                  no_response: 'archived',
                  qualified_out: 'rejected',
                }
                const newStatus = statusMap[outcome.outcome_type]
                if (newStatus) {
                  onUpdate(lead.id, { status: newStatus as Lead['status'] })
                }
              }}
            />
          </div>

          <Separator />

          {/* Status & Notes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this lead..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={4}
              />
              {saving && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRequalify}
              disabled={requalifying}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${requalifying ? 'animate-spin' : ''}`} />
              Re-qualify
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            <p>Created {formatAbsoluteDate(lead.created_at)}</p>
            {lead.qualified_at && (
              <p>Qualified {formatAbsoluteDate(lead.qualified_at)}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
