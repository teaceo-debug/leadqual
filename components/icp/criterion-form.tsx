'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import type { ICPCriterion } from '@/types'

interface CriterionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  criterion?: ICPCriterion | null
  onSave: (data: Partial<ICPCriterion>) => void
  saving: boolean
}

const DATA_TYPES = [
  { value: 'company_size', label: 'Company Size' },
  { value: 'industry', label: 'Industry' },
  { value: 'budget', label: 'Budget Range' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'custom', label: 'Custom' },
]

export function CriterionForm({
  open,
  onOpenChange,
  criterion,
  onSave,
  saving,
}: CriterionFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState(50)
  const [dataType, setDataType] = useState('custom')
  const [idealValues, setIdealValues] = useState<string[]>([])
  const [newValue, setNewValue] = useState('')

  const isEditing = !!criterion

  useEffect(() => {
    if (criterion) {
      setName(criterion.name)
      setDescription(criterion.description || '')
      setWeight(criterion.weight)
      setDataType(criterion.data_type)
      setIdealValues(criterion.ideal_values || [])
    } else {
      setName('')
      setDescription('')
      setWeight(50)
      setDataType('custom')
      setIdealValues([])
    }
  }, [criterion, open])

  const handleAddValue = () => {
    if (newValue.trim() && !idealValues.includes(newValue.trim())) {
      setIdealValues([...idealValues, newValue.trim()])
      setNewValue('')
    }
  }

  const handleRemoveValue = (value: string) => {
    setIdealValues(idealValues.filter((v) => v !== value))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddValue()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      description: description || undefined,
      weight,
      data_type: dataType,
      ideal_values: idealValues,
    })
  }

  const isValid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Criterion' : 'Add Criterion'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Size"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this criterion evaluates..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Weight</Label>
              <span className="text-sm font-medium">{weight}%</span>
            </div>
            <Slider
              value={[weight]}
              onValueChange={(v) => setWeight(v[0])}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              How important is this criterion in the overall qualification score?
            </p>
          </div>

          <div className="space-y-3">
            <Label>Ideal Values</Label>
            <p className="text-xs text-muted-foreground">
              Add values that represent the best match for this criterion.
            </p>
            <div className="flex gap-2">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a value..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddValue}
                disabled={!newValue.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {idealValues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {idealValues.map((value) => (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="pl-2 pr-1 py-1"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(value)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Criterion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
