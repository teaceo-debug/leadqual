'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, Clock, UserX, Loader2 } from 'lucide-react'

type OutcomeType = 'converted' | 'rejected' | 'no_response' | 'qualified_out'

interface OutcomeButtonsProps {
  leadId: string
  onOutcomeRecorded?: (outcome: { outcome_type: OutcomeType }) => void
}

const outcomeConfig: Record<OutcomeType, {
  label: string
  description: string
  icon: React.ElementType
  variant: 'default' | 'destructive' | 'outline' | 'secondary'
  askValue?: boolean
}> = {
  converted: {
    label: 'Converted',
    description: 'Lead became a customer',
    icon: CheckCircle2,
    variant: 'default',
    askValue: true,
  },
  rejected: {
    label: 'Rejected',
    description: 'Lead was not a good fit',
    icon: XCircle,
    variant: 'destructive',
  },
  no_response: {
    label: 'No Response',
    description: 'Lead did not respond to outreach',
    icon: Clock,
    variant: 'secondary',
  },
  qualified_out: {
    label: 'Qualified Out',
    description: 'Lead disqualified during sales process',
    icon: UserX,
    variant: 'outline',
  },
}

export function OutcomeButtons({ leadId, onOutcomeRecorded }: OutcomeButtonsProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null)
  const [dealValue, setDealValue] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOutcomeClick = (outcome: OutcomeType) => {
    setSelectedOutcome(outcome)
    setDealValue('')
    setNotes('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedOutcome) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/leads/${leadId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome_type: selectedOutcome,
          outcome_value: dealValue ? parseFloat(dealValue) : undefined,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record outcome')
      }

      onOutcomeRecorded?.({ outcome_type: selectedOutcome })
      setSelectedOutcome(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const config = selectedOutcome ? outcomeConfig[selectedOutcome] : null

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(outcomeConfig) as OutcomeType[]).map((outcome) => {
          const { label, icon: Icon, variant } = outcomeConfig[outcome]
          return (
            <Button
              key={outcome}
              variant={variant}
              size="sm"
              onClick={() => handleOutcomeClick(outcome)}
              className="flex-1 min-w-[100px]"
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          )
        })}
      </div>

      <Dialog open={!!selectedOutcome} onOpenChange={() => setSelectedOutcome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Outcome: {config?.label}</DialogTitle>
            <DialogDescription>{config?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {config?.askValue && (
              <div className="space-y-2">
                <Label htmlFor="deal-value">Deal Value (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="deal-value"
                    type="number"
                    placeholder="10,000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any relevant notes about this outcome..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOutcome(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
