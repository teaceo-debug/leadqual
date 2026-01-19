'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { LEAD_STATUSES, QUALIFICATION_LABELS } from '@/lib/constants'

export function LeadFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const label = searchParams.get('label') || ''
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    // Handle "all" as empty/clear filter
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to first page
    router.push(`/dashboard/leads?${params}`)
  }

  const clearFilters = () => {
    router.push('/dashboard/leads')
  }

  const hasFilters = label || status || search

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Label filter */}
      <Select value={label || 'all'} onValueChange={(value) => updateFilter('label', value)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All labels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All labels</SelectItem>
          {QUALIFICATION_LABELS.map((l) => (
            <SelectItem key={l} value={l} className="capitalize">
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
