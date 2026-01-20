import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const leadSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  company_name: z.string().optional(),
  company_website: z.string().url().optional().or(z.literal('')).or(z.null()),
  company_size: z.string().optional(),
  industry: z.string().optional(),
  budget_range: z.string().optional(),
  timeline: z.string().optional(),
  challenge: z.string().optional(),
})

const importSchema = z.object({
  leads: z.array(leadSchema).min(1).max(1000),
  skip_duplicates: z.boolean().optional().default(true),
  auto_qualify: z.boolean().optional().default(true),
})

// POST /api/leads/import - Bulk import leads from CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and verify admin role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = importSchema.parse(body)

    const adminClient = createAdminClient()

    // Track results
    const results = {
      total: validatedData.leads.length,
      imported: 0,
      skipped: 0,
      errors: [] as { email: string; error: string }[],
    }

    // Get existing emails if skip_duplicates is enabled
    let existingEmails = new Set<string>()
    if (validatedData.skip_duplicates) {
      const { data: existingLeads } = await adminClient
        .from('leads')
        .select('email')
        .eq('organization_id', membership.organization_id)

      if (existingLeads) {
        existingEmails = new Set(existingLeads.map((l) => l.email.toLowerCase()))
      }
    }

    // Process leads in batches
    const batchSize = 50
    const leadsToInsert = []
    const leadsToQualify: string[] = []

    for (const lead of validatedData.leads) {
      // Check for duplicate
      if (validatedData.skip_duplicates && existingEmails.has(lead.email.toLowerCase())) {
        results.skipped++
        continue
      }

      leadsToInsert.push({
        organization_id: membership.organization_id,
        email: lead.email,
        first_name: lead.first_name || null,
        last_name: lead.last_name || null,
        phone: lead.phone || null,
        job_title: lead.job_title || null,
        company_name: lead.company_name || null,
        company_website: lead.company_website || null,
        company_size: lead.company_size || null,
        industry: lead.industry || null,
        budget_range: lead.budget_range || null,
        timeline: lead.timeline || null,
        challenge: lead.challenge || null,
        source: 'csv_import',
      })
    }

    // Insert in batches
    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize)
      const { data: insertedLeads, error } = await adminClient
        .from('leads')
        .insert(batch)
        .select('id, email')

      if (error) {
        console.error('Batch insert error:', error)
        batch.forEach((lead) => {
          results.errors.push({ email: lead.email, error: 'Insert failed' })
        })
      } else if (insertedLeads) {
        results.imported += insertedLeads.length
        if (validatedData.auto_qualify) {
          leadsToQualify.push(...insertedLeads.map((l) => l.id))
        }
      }
    }

    // Trigger qualification jobs for imported leads (async, non-blocking)
    if (validatedData.auto_qualify && leadsToQualify.length > 0) {
      // Process in smaller batches to avoid overwhelming the API
      const qualifyBatchSize = 10
      for (let i = 0; i < leadsToQualify.length; i += qualifyBatchSize) {
        const batch = leadsToQualify.slice(i, i + qualifyBatchSize)
        batch.forEach((leadId) => {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/qualify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId }),
          }).catch(console.error)
        })
        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: membership.organization_id,
      user_id: user.id,
      action: 'leads.bulk_imported',
      details: {
        total: results.total,
        imported: results.imported,
        skipped: results.skipped,
        errors_count: results.errors.length,
      },
    })

    return NextResponse.json({
      success: true,
      results,
      message: `Successfully imported ${results.imported} of ${results.total} leads`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Lead import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
