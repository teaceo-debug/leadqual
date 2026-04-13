import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fireCAPIEvent } from '@/lib/capi'

function findField(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (data[key]) return String(data[key])
  }
  return null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const MAX_SUBMISSION_SIZE = 50_000

// POST /api/forms/[id]/submit - Public form submission (no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    // Fetch the form
    const { data: form, error: formError } = await admin
      .from('forms')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_SUBMISSION_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = await request.json()
    if (body._honeypot) {
      return NextResponse.json({ success: true })
    }

    const submissionData = body.data || {}
    const utm = body.utm || {}
    const tracking = body.tracking || {}

    // Create submission
    const { data: submission, error: submitError } = await admin
      .from('form_submissions')
      .insert({
        form_id: form.id,
        organization_id: form.organization_id,
        data: submissionData,
        source_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
        utm_source: utm.source || null,
        utm_medium: utm.medium || null,
        utm_campaign: utm.campaign || null,
        utm_term: utm.term || null,
        utm_content: utm.content || null,
      })
      .select()
      .single()

    if (submitError) {
      console.error('Error creating submission:', submitError)
      return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
    }

    // Increment submission count
    await admin
      .from('forms')
      .update({ submission_count: (form.submission_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', form.id)

    // Extract email from submission data
    const rawEmail = submissionData.email
      || submissionData.Email
      || submissionData['Email Address']
      || submissionData['email_address']
      || Object.entries(submissionData).find(([k]) => k.toLowerCase().includes('email'))?.[1]
    const email = typeof rawEmail === 'string' && isValidEmail(rawEmail) ? rawEmail : null

    let createdLeadId: string | null = null
    const firstName = findField(submissionData, ['first_name', 'First Name', 'first name', 'name'])
    const lastName = findField(submissionData, ['last_name', 'Last Name', 'last name'])
    const phone = findField(submissionData, ['phone', 'Phone', 'Phone Number', 'phone_number'])

    if (email) {
      // Find existing or create new lead
      const { data: existingLead } = await admin
        .from('leads')
        .select('id')
        .eq('organization_id', form.organization_id)
        .eq('email', email)
        .limit(1)
        .single()

      let leadId: string | null = existingLead?.id || null

      if (!leadId) {
        const { data: newLead, error: leadError } = await admin
          .from('leads')
          .insert({
            organization_id: form.organization_id,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            company_name: findField(submissionData, ['company_name', 'Company', 'Company Name', 'company']),
            source_ip: request.headers.get('x-forwarded-for'),
            user_agent: request.headers.get('user-agent'),
            referrer: request.headers.get('referer'),
            // Store tracking identifiers for downstream CAPI events (Purchase, ClosedWon)
            fbclid: tracking.fbclid || null,
            fbp: tracking.fbp || null,
            fbc: tracking.fbc || null,
          })
          .select('id')
          .single()

        if (leadError) console.error('Error creating lead:', leadError)
        leadId = newLead?.id || null
      } else {
        // Update existing lead with tracking if not already set
        await admin.from('leads').update({
          fbclid: tracking.fbclid || undefined,
          fbp: tracking.fbp || undefined,
          fbc: tracking.fbc || undefined,
        }).eq('id', leadId).is('fbclid', null)
      }

      if (leadId) {
        createdLeadId = leadId
        await admin.from('form_submissions').update({ lead_id: leadId }).eq('id', submission.id)

        // Trigger AI qualification
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        fetch(`${appUrl}/api/qualify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        }).catch(() => {})
      }
    }

    // Fire CAPI Lead event using shared module
    const fb = form.facebook as { pixel_id?: string; access_token?: string; test_event_code?: string } | undefined
    if (fb?.pixel_id && fb?.access_token && email) {
      fireCAPIEvent({
        eventName: 'Lead',
        eventId: submission.id,
        eventSourceUrl: request.headers.get('referer') || undefined,
        email,
        phone: phone || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        fbclid: tracking.fbclid,
        fbp: tracking.fbp,
        fbc: tracking.fbc,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        userAgent: request.headers.get('user-agent') || '',
        countryCode: tracking.country_code,
        zipCode: tracking.zip_code,
        externalId: createdLeadId || undefined,
        score: 0, // Score not available yet — QualifiedLead event will send score after AI runs
        pixelId: fb.pixel_id,
        accessToken: fb.access_token,
        testEventCode: fb.test_event_code,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      lead_score: 0, // Score pending — AI qualification runs async
      thank_you: {
        title: form.thank_you_title,
        message: form.thank_you_message,
        redirect_url: form.redirect_url,
      },
    })
  } catch (error) {
    console.error('Form submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
