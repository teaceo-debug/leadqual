'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FormBranding } from '@/types'

const fonts = [
  { value: 'system-ui', label: 'System Default' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier New' },
]

const radii = [
  { value: '0px', label: 'Square' },
  { value: '6px', label: 'Rounded (Default)' },
  { value: '12px', label: 'More Rounded' },
  { value: '9999px', label: 'Pill' },
]

interface BrandingEditorProps {
  branding: FormBranding
  onChange: (branding: FormBranding) => void
}

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  function update(key: keyof FormBranding, value: string) {
    onChange({ ...branding, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Logo URL</Label>
        <Input
          value={branding.logo_url || ''}
          onChange={(e) => update('logo_url', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Primary Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.primary_color || '#2563EB'}
              onChange={(e) => update('primary_color', e.target.value)}
              className="h-9 w-9 rounded border cursor-pointer"
            />
            <Input
              value={branding.primary_color || '#2563EB'}
              onChange={(e) => update('primary_color', e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.background_color || '#F9FAFB'}
              onChange={(e) => update('background_color', e.target.value)}
              className="h-9 w-9 rounded border cursor-pointer"
            />
            <Input
              value={branding.background_color || '#F9FAFB'}
              onChange={(e) => update('background_color', e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Text Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={branding.text_color || '#111827'}
            onChange={(e) => update('text_color', e.target.value)}
            className="h-9 w-9 rounded border cursor-pointer"
          />
          <Input
            value={branding.text_color || '#111827'}
            onChange={(e) => update('text_color', e.target.value)}
            className="text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Font</Label>
        <Select
          value={branding.font_family || 'system-ui'}
          onValueChange={(v) => update('font_family', v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {fonts.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Corner Radius</Label>
        <Select
          value={branding.border_radius || '6px'}
          onValueChange={(v) => update('border_radius', v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {radii.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Submit Button Text</Label>
        <Input
          value={branding.button_text || ''}
          onChange={(e) => update('button_text', e.target.value)}
          placeholder="Submit"
        />
      </div>
    </div>
  )
}
