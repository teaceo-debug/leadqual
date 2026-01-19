import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/leads/export - Export leads to CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // First verify we have an authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url)
    const label = searchParams.get('label')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    // Build query
    let query = supabase
      .from('leads')
      .select('*')
      .eq('organization_id', member.organization_id)
      .order('created_at', { ascending: false })

    if (label) query = query.eq('label', label)
    if (status) query = query.eq('status', status)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)

    const { data: leads, error } = await query

    if (error) {
      console.error('Failed to fetch leads for export:', error)
      return NextResponse.json({ error: 'Failed to export leads' }, { status: 500 })
    }

    // Generate CSV
    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Phone',
      'Job Title',
      'Company',
      'Company Website',
      'Company Size',
      'Industry',
      'Budget Range',
      'Timeline',
      'Challenge',
      'Score',
      'Label',
      'Status',
      'Created At',
    ]

    const csvRows = [headers.join(',')]

    for (const lead of leads || []) {
      const row = [
        lead.email,
        lead.first_name || '',
        lead.last_name || '',
        lead.phone || '',
        lead.job_title || '',
        lead.company_name || '',
        lead.company_website || '',
        lead.company_size || '',
        lead.industry || '',
        lead.budget_range || '',
        lead.timeline || '',
        (lead.challenge || '').replace(/"/g, '""'),
        lead.score || '',
        lead.label || '',
        lead.status || '',
        lead.created_at,
      ].map((field) => `"${field}"`)
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\n')
    const filename = `leads-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
