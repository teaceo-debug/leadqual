'use client'

import { Button } from '@/components/ui/button'
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  List,
  ChevronDown,
  CheckSquare,
} from 'lucide-react'
import type { FormFieldType } from '@/types'

const fieldTypes: { type: FormFieldType; label: string; icon: React.ElementType }[] = [
  { type: 'short_text', label: 'Short Text', icon: Type },
  { type: 'long_text', label: 'Long Text', icon: AlignLeft },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
]

interface FieldPaletteProps {
  onAddField: (type: FormFieldType) => void
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Add Fields
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {fieldTypes.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="h-auto flex-col gap-1.5 py-3 text-xs"
            onClick={() => onAddField(type)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
