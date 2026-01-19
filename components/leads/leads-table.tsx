'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ScoreGauge } from '@/components/leads/score-gauge'
import { formatRelativeDate, getLabelColor } from '@/lib/utils'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Lead } from '@/types'

interface LeadsTableProps {
  leads: Lead[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  onSelect: (lead: Lead) => void
  selectedId?: string
}

export function LeadsTable({
  leads,
  loading,
  pagination,
  onSelect,
  selectedId,
}: LeadsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`/dashboard/leads?${params}`)
  }

  if (loading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border p-8">
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No leads yet"
          description="When visitors submit your form, they'll appear here."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Name</TableHead>
              <TableHead className="w-[20%]">Company</TableHead>
              <TableHead className="w-[10%]">Score</TableHead>
              <TableHead className="w-[10%]">Label</TableHead>
              <TableHead className="w-[15%]">Date</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className={`cursor-pointer transition-colors ${
                  selectedId === lead.id ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onClick={() => onSelect(lead)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{lead.company_name || '-'}</p>
                    {lead.industry && (
                      <p className="text-sm text-muted-foreground">{lead.industry}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.score !== null ? (
                    <ScoreGauge score={lead.score} size="sm" />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.label ? (
                    <Badge className={getLabelColor(lead.label)}>
                      {lead.label.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {formatRelativeDate(lead.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {lead.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} leads
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
