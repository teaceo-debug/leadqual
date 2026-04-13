'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import type { FormField, FormFieldCondition } from '@/types'

interface ConditionEditorProps {
  field: FormField
  allFields: FormField[]
  onChange: (field: FormField) => void
}

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_empty', label: 'Is not empty' },
  { value: 'is_empty', label: 'Is empty' },
]

const needsValue = (op: string) => !['not_empty', 'is_empty'].includes(op)

export function ConditionEditor({ field, allFields, onChange }: ConditionEditorProps) {
  const conditions = field.conditions || []
  // Only show fields that come before this one (and aren't page breaks)
  const availableFields = allFields.filter(
    (f) => f.id !== field.id && f.type !== 'page_break'
  )

  function addCondition() {
    if (availableFields.length === 0) return
    const newCondition: FormFieldCondition = {
      field_id: availableFields[0].id,
      operator: 'not_empty',
    }
    onChange({ ...field, conditions: [...conditions, newCondition] })
  }

  function updateCondition(index: number, updates: Partial<FormFieldCondition>) {
    const updated = conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    onChange({ ...field, conditions: updated })
  }

  function removeCondition(index: number) {
    onChange({ ...field, conditions: conditions.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs">Show this field when...</Label>

      {conditions.length === 0 && (
        <p className="text-xs text-muted-foreground">Always visible (no conditions)</p>
      )}

      {conditions.map((condition, i) => {
        const sourceField = allFields.find((f) => f.id === condition.field_id)
        return (
          <div key={i} className="space-y-2 rounded border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Condition {i + 1}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCondition(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <Select
              value={condition.field_id}
              onValueChange={(v) => updateCondition(i, { field_id: v })}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={condition.operator}
              onValueChange={(v) => updateCondition(i, { operator: v as FormFieldCondition['operator'] })}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsValue(condition.operator) && (
              sourceField?.options ? (
                <Select
                  value={condition.value || ''}
                  onValueChange={(v) => updateCondition(i, { value: v })}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select value..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceField.options.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={condition.value || ''}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  placeholder="Value..."
                  className="text-xs h-8"
                />
              )
            )}
          </div>
        )
      })}

      {availableFields.length > 0 && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={addCondition}>
          <Plus className="mr-1 h-3 w-3" />
          Add Condition
        </Button>
      )}
    </div>
  )
}
