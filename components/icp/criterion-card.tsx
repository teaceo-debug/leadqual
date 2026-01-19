'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Slider } from '@/components/ui/slider'
import { Edit2, Trash2, GripVertical } from 'lucide-react'
import type { ICPCriterion } from '@/types'

interface CriterionCardProps {
  criterion: ICPCriterion
  onEdit: (criterion: ICPCriterion) => void
  onDelete: (id: string) => void
  onWeightChange: (id: string, weight: number) => void
}

export function CriterionCard({
  criterion,
  onEdit,
  onDelete,
  onWeightChange,
}: CriterionCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [localWeight, setLocalWeight] = useState(criterion.weight)

  const handleWeightChange = (value: number[]) => {
    setLocalWeight(value[0])
  }

  const handleWeightCommit = () => {
    if (localWeight !== criterion.weight) {
      onWeightChange(criterion.id, localWeight)
    }
  }

  const getDataTypeLabel = (dataType: string) => {
    const labels: Record<string, string> = {
      company_size: 'Company Size',
      industry: 'Industry',
      budget: 'Budget Range',
      timeline: 'Timeline',
      job_title: 'Job Title',
      custom: 'Custom',
    }
    return labels[dataType] || dataType
  }

  return (
    <>
      <Card className="group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
              <div>
                <CardTitle className="text-base">{criterion.name}</CardTitle>
                <Badge variant="outline" className="mt-1 text-xs">
                  {getDataTypeLabel(criterion.data_type)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(criterion)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {criterion.description && (
            <p className="text-sm text-muted-foreground">{criterion.description}</p>
          )}

          {criterion.ideal_values && criterion.ideal_values.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Ideal Values
              </p>
              <div className="flex flex-wrap gap-1">
                {criterion.ideal_values.map((value, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Weight</p>
              <span className="text-sm font-medium">{localWeight}%</span>
            </div>
            <Slider
              value={[localWeight]}
              onValueChange={handleWeightChange}
              onValueCommit={handleWeightCommit}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Criterion"
        description={`Are you sure you want to delete "${criterion.name}"? This action cannot be undone.`}
        confirmText={criterion.name}
        onConfirm={() => onDelete(criterion.id)}
        variant="destructive"
      />
    </>
  )
}
