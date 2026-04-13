'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, X } from 'lucide-react'
import type { FormField } from '@/types'

interface FieldEditorProps {
  field: FormField
  onChange: (field: FormField) => void
}

export function FieldEditor({ field, onChange }: FieldEditorProps) {
  const hasOptions = field.type === 'multiple_choice' || field.type === 'dropdown'

  function addOption() {
    const options = field.options || []
    const id = crypto.randomUUID()
    onChange({
      ...field,
      options: [...options, { id, label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }],
    })
  }

  function updateOption(id: string, label: string) {
    onChange({
      ...field,
      options: (field.options || []).map((opt) =>
        opt.id === id ? { ...opt, label, value: label.toLowerCase().replace(/\s+/g, '_') } : opt
      ),
    })
  }

  function removeOption(id: string) {
    onChange({
      ...field,
      options: (field.options || []).filter((opt) => opt.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Field Settings
      </h3>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="field-label" className="text-xs">Label</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="field-placeholder" className="text-xs">Placeholder</Label>
          <Input
            id="field-placeholder"
            value={field.placeholder || ''}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="field-required" className="text-xs">Required</Label>
          <Switch
            id="field-required"
            checked={field.required}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
          />
        </div>
      </div>

      {hasOptions && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs">Options</Label>
            {(field.options || []).map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeOption(option.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={addOption}>
              <Plus className="mr-2 h-3 w-3" />
              Add Option
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
