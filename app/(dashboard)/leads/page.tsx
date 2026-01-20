'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadDetailPanel } from '@/components/leads/lead-detail-panel'
import { LeadFilters } from '@/components/leads/lead-filters'
import { Button } from '@/components/ui/button'
import { LeadImportDialog } from '@/components/leads/lead-import-dialog'
import { Download, Upload } from 'lucide-react'
import type { Lead } from '@/types'

export default function LeadsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 0,
  })
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Get filter values from URL
  const label = searchParams.get('label') || ''
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    fetchLeads()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new as Lead, ...prev])
            setPagination((prev) => ({ ...prev, total: prev.total + 1 }))
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? (payload.new as Lead) : l))
            )
            if (selectedLead?.id === payload.new.id) {
              setSelectedLead(payload.new as Lead)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [label, status, search, page])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '25')
      if (label) params.set('label', label)
      if (status) params.set('status', status)
      if (search) params.set('search', search)

      const response = await fetch(`/api/leads?${params}`)
      const data = await response.json()

      if (response.ok) {
        setLeads(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (label) params.set('label', label)
    if (status) params.set('status', status)
    window.location.href = `/api/leads/export?${params}`
  }

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead)
  }

  const handleLeadClose = () => {
    setSelectedLead(null)
  }

  const handleLeadUpdate = async (leadId: string, updates: Partial<Lead>) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const { lead } = await response.json()
        setLeads((prev) => prev.map((l) => (l.id === leadId ? lead : l)))
        if (selectedLead?.id === leadId) {
          setSelectedLead(lead)
        }
      }
    } catch (error) {
      console.error('Failed to update lead:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Manage and review your qualified leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportDialog(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <LeadFilters />

      <LeadsTable
        leads={leads}
        loading={loading}
        pagination={pagination}
        onSelect={handleLeadSelect}
        selectedId={selectedLead?.id}
      />

      <LeadDetailPanel
        lead={selectedLead}
        onClose={handleLeadClose}
        onUpdate={handleLeadUpdate}
      />

      <LeadImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={fetchLeads}
      />
    </div>
  )
}
