import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateICPFromDomain,
  generateICPFromCSV,
  parseCSVText,
  type CustomerRecord,
} from '@/lib/icp-generator'

// POST /api/icp/generate - Generate ICP criteria from domain or CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Only admins can generate ICP
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { type, domain, customers, csv_text } = body

    if (!type || !['domain', 'csv'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "domain" or "csv"' },
        { status: 400 }
      )
    }

    let result
    let inputData: Record<string, unknown>

    if (type === 'domain') {
      // Domain-based generation
      if (!domain || typeof domain !== 'string') {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
      }

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      if (!domainRegex.test(cleanDomain)) {
        return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
      }

      inputData = { domain: cleanDomain }
      result = await generateICPFromDomain(cleanDomain)
    } else {
      // CSV-based generation
      let customerRecords: CustomerRecord[]

      if (csv_text && typeof csv_text === 'string') {
        // Parse CSV text
        try {
          customerRecords = parseCSVText(csv_text)
        } catch (parseError) {
          return NextResponse.json(
            { error: parseError instanceof Error ? parseError.message : 'Failed to parse CSV' },
            { status: 400 }
          )
        }
      } else if (customers && Array.isArray(customers)) {
        // Use pre-parsed customers array
        customerRecords = customers
      } else {
        return NextResponse.json(
          { error: 'Either csv_text or customers array is required' },
          { status: 400 }
        )
      }

      if (customerRecords.length < 5) {
        return NextResponse.json(
          { error: 'At least 5 customer records are required for pattern analysis' },
          { status: 400 }
        )
      }

      if (customerRecords.length > 10000) {
        return NextResponse.json(
          { error: 'Maximum 10,000 customer records allowed' },
          { status: 400 }
        )
      }

      inputData = {
        record_count: customerRecords.length,
        sample_fields: Object.keys(customerRecords[0] || {}),
      }
      result = await generateICPFromCSV(customerRecords)
    }

    // Store the generation in the database
    const { data: generation, error: insertError } = await supabase
      .from('icp_generations')
      .insert({
        organization_id: membership.organization_id,
        generation_type: type,
        input_data: inputData,
        generated_criteria: result.criteria,
        ai_reasoning: result.reasoning,
        status: 'completed',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing generation:', insertError)
      // Continue anyway - the generation was successful
    }

    return NextResponse.json(
      {
        generation_id: generation?.id,
        ...result,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('ICP generate error:', error)

    // Handle specific AI errors
    if (error instanceof Error) {
      if (error.message.includes('No JSON found')) {
        return NextResponse.json(
          { error: 'AI response was malformed. Please try again.' },
          { status: 500 }
        )
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ error: 'Failed to generate ICP criteria' }, { status: 500 })
  }
}

// GET /api/icp/generate - Get ICP generation history
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get generation history
    const { data: generations, error } = await supabase
      .from('icp_generations')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching generations:', error)
      return NextResponse.json({ error: 'Failed to fetch generation history' }, { status: 500 })
    }

    return NextResponse.json({ generations })
  } catch (error) {
    console.error('ICP generate GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
