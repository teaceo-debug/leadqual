'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2, Type, AlignLeft, Mail, Phone, Hash, List, ChevronDown, CheckSquare, SeparatorHorizontal } from 'lucide-react'
import type { FormField, FormFieldType } from '@/types'

const fieldIcons: Record<FormFieldType, React.ElementType> = {
  short_text: Type,
  long_text: AlignLeft,
  email: Mail,
  phone: Phone,
  number: Hash,
  multiple_choice: List,
  dropdown: ChevronDown,
  checkbox: CheckSquare,
  page_break: SeparatorHorizontal,
}

const fieldLabels: Record<FormFieldType, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  multiple_choice: 'Multiple Choice',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  page_break: 'Page Break',
}

interface SortableFieldProps {
  field: FormField
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function SortableField({ field, isSelected, onSelect, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Icon = fieldIcons[field.type]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors cursor-pointer',
        isSelected && 'border-primary ring-1 ring-primary',
        isDragging && 'opacity-50',
        !isSelected && 'hover:border-muted-foreground/30'
      )}
      onClick={onSelect}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{field.label}</p>
        <p className="text-xs text-muted-foreground">{fieldLabels[field.type]}</p>
      </div>

      {field.required && (
        <span className="text-xs text-destructive font-medium">*</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

interface CanvasProps {
  fields: FormField[]
  selectedFieldId: string | null
  onFieldsChange: (fields: FormField[]) => void
  onSelectField: (id: string | null) => void
  onDeleteField: (id: string) => void
}

export function Canvas({
  fields,
  selectedFieldId,
  onFieldsChange,
  onSelectField,
  onDeleteField,
}: CanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      onFieldsChange(arrayMove(fields, oldIndex, newIndex))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed text-muted-foreground">
            <p className="text-sm font-medium mb-1">No fields yet</p>
            <p className="text-xs">Add fields from the panel on the left</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </DndContext>
  )
}
