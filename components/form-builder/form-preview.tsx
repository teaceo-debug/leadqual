'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FormField, FormBranding } from '@/types'

interface FormPreviewProps {
  fields: FormField[]
  formName: string
  branding?: FormBranding
}

export function FormPreview({ fields, formName, branding }: FormPreviewProps) {
  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Add fields to see a preview
      </div>
    )
  }

  const hasPages = fields.some((f) => f.type === 'page_break')

  return (
    <div className="max-w-md mx-auto space-y-6" style={{ color: branding?.text_color }}>
      {branding?.logo_url && (
        <div className="flex justify-center">
          <img src={branding.logo_url} alt="Logo" className="h-10 object-contain" />
        </div>
      )}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">{formName}</h2>
      </div>

      <div className="space-y-4">
        {fields.map((field) => {
          if (field.type === 'page_break') {
            return (
              <div key={field.id} className="flex items-center gap-3 py-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">
                  {field.label || 'Next Page'}
                </span>
                <Separator className="flex-1" />
              </div>
            )
          }

          return (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.conditions && field.conditions.length > 0 && (
                <p className="text-[10px] text-muted-foreground">Conditional</p>
              )}
              {renderField(field, branding)}
            </div>
          )
        })}
      </div>

      <Button
        className="w-full"
        disabled
        style={{
          backgroundColor: branding?.primary_color,
          borderRadius: branding?.border_radius,
        }}
      >
        {hasPages ? 'Next' : (branding?.button_text || 'Submit')}
      </Button>
    </div>
  )
}

function renderField(field: FormField, branding?: FormBranding) {
  const inputStyle = { borderRadius: branding?.border_radius }

  switch (field.type) {
    case 'short_text':
      return <Input placeholder={field.placeholder || 'Enter text...'} disabled style={inputStyle} />
    case 'long_text':
      return <Textarea placeholder={field.placeholder || 'Enter text...'} disabled rows={3} style={inputStyle} />
    case 'email':
      return <Input type="email" placeholder={field.placeholder || 'email@example.com'} disabled style={inputStyle} />
    case 'phone':
      return <Input type="tel" placeholder={field.placeholder || '(555) 000-0000'} disabled style={inputStyle} />
    case 'number':
      return <Input type="number" placeholder={field.placeholder || '0'} disabled style={inputStyle} />
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
          <SelectTrigger style={inputStyle}>
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
