'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FormField } from '@/types'

interface FormPreviewProps {
  fields: FormField[]
  formName: string
}

export function FormPreview({ fields, formName }: FormPreviewProps) {
  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Add fields to see a preview
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">{formName}</h2>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderField(field)}
          </div>
        ))}
      </div>

      <Button className="w-full" disabled>
        Submit
      </Button>
    </div>
  )
}

function renderField(field: FormField) {
  switch (field.type) {
    case 'short_text':
      return <Input placeholder={field.placeholder || 'Enter text...'} disabled />
    case 'long_text':
      return <Textarea placeholder={field.placeholder || 'Enter text...'} disabled rows={3} />
    case 'email':
      return <Input type="email" placeholder={field.placeholder || 'email@example.com'} disabled />
    case 'phone':
      return <Input type="tel" placeholder={field.placeholder || '(555) 000-0000'} disabled />
    case 'number':
      return <Input type="number" placeholder={field.placeholder || '0'} disabled />
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {(field.options || []).map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border border-input" />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
          {(!field.options || field.options.length === 0) && (
            <p className="text-xs text-muted-foreground">No options added</p>
          )}
        </div>
      )
    case 'dropdown':
      return (
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Select an option...'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox disabled />
          <span className="text-sm text-muted-foreground">
            {field.placeholder || 'I agree'}
          </span>
        </div>
      )
    default:
      return null
  }
}
