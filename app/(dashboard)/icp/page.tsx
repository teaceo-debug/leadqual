'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { EmptyState } from '@/components/shared/empty-state'
import { CriterionCard } from '@/components/icp/criterion-card'
import { CriterionForm } from '@/components/icp/criterion-form'
import { ICPGenerator } from '@/components/icp/icp-generator'
import { Plus, Target, AlertCircle, Wand2 } from 'lucide-react'
import type { ICPCriterion } from '@/types'

export default function ICPPage() {
  const [criteria, setCriteria] = useState<ICPCriterion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCriterion, setEditingCriterion] = useState<ICPCriterion | null>(null)
  const [saving, setSaving] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)

  useEffect(() => {
    fetchCriteria()
  }, [])

  const fetchCriteria = async () => {
    try {
      const response = await fetch('/api/icp')
      const data = await response.json()

      if (response.ok) {
        setCriteria(data.criteria)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch ICP criteria')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: Partial<ICPCriterion>) => {
    setSaving(true)
    try {
      const response = await fetch('/api/icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setCriteria([...criteria, result.criterion])
        setFormOpen(false)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to create criterion')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: Partial<ICPCriterion>) => {
    if (!editingCriterion) return

    setSaving(true)
    try {
      const response = await fetch(`/api/icp/${editingCriterion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setCriteria(criteria.map((c) => (c.id === editingCriterion.id ? result.criterion : c)))
        setEditingCriterion(null)
        setFormOpen(false)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to update criterion')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/icp/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCriteria(criteria.filter((c) => c.id !== id))
      } else {
        const result = await response.json()
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to delete criterion')
    }
  }

  const handleWeightChange = async (id: string, weight: number) => {
    try {
      const response = await fetch(`/api/icp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight }),
      })

      const result = await response.json()

      if (response.ok) {
        setCriteria(criteria.map((c) => (c.id === id ? result.criterion : c)))
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to update weight')
    }
  }

  const handleEdit = (criterion: ICPCriterion) => {
    setEditingCriterion(criterion)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingCriterion(null)
    }
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20 mt-1" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ICP Configuration</h1>
          <p className="text-muted-foreground">
            Define your Ideal Customer Profile criteria for lead qualification
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGenerator(true)}>
            <Wand2 className="mr-2 h-4 w-4" />
            Auto-Generate ICP
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Criterion
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Weight summary */}
      {criteria.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weight Distribution</CardTitle>
            <CardDescription>
              Total weight: {totalWeight}%
              {totalWeight !== 100 && (
                <span className="text-warning ml-2">
                  (Recommended: 100%)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              {criteria.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="h-full transition-all"
                  style={{
                    width: `${(criterion.weight / Math.max(totalWeight, 100)) * 100}%`,
                    backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
                  }}
                  title={`${criterion.name}: ${criterion.weight}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
                    }}
                  />
                  <span className="text-muted-foreground">
                    {criterion.name}: {criterion.weight}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Criteria grid */}
      {criteria.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="No ICP criteria yet"
            description="Add criteria to define your ideal customer profile, or let AI auto-generate them based on your company or customer data."
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setShowGenerator(true)}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Auto-Generate ICP
                </Button>
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Manually
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {criteria.map((criterion) => (
            <CriterionCard
              key={criterion.id}
              criterion={criterion}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onWeightChange={handleWeightChange}
            />
          ))}
        </div>
      )}

      <CriterionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        criterion={editingCriterion}
        onSave={editingCriterion ? handleUpdate : handleCreate}
        saving={saving}
      />

      <Sheet open={showGenerator} onOpenChange={setShowGenerator}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <ICPGenerator
            onComplete={() => {
              fetchCriteria()
              setShowGenerator(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
