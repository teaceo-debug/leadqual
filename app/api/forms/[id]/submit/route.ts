import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Find a field value by checking multiple possible label names
function findField(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (data[key]) return String(data[key])
  }
  return null
}

// Basic email format check
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const MAX_SUBMISSION_SIZE = 50_000 // 50KB

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

    // Honeypot check
    if (body._honeypot) {
      return NextResponse.json({ success: true })
    }

    const submissionData = body.data || {}

    // Extract UTM params
    const utm = body.utm || {}

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

    // Try to create a lead from the submission data if email exists
    // Data is keyed by field labels, so check common email label patterns
    let createdLeadId: string | null = null
    const rawEmail = submissionData.email
      || submissionData.Email
      || submissionData['Email Address']
      || submissionData['email_address']
      || Object.entries(submissionData).find(([k]) => k.toLowerCase().includes('email'))?.[1]
    const email = typeof rawEmail === 'string' && isValidEmail(rawEmail) ? rawEmail : null

    if (email) {
      // Upsert: find existing lead or create new one to avoid duplicates
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
            first_name: findField(submissionData, ['first_name', 'First Name', 'first name', 'name']),
            last_name: findField(submissionData, ['last_name', 'Last Name', 'last name']),
            phone: findField(submissionData, ['phone', 'Phone', 'Phone Number', 'phone_number']),
            company_name: findField(submissionData, ['company_name', 'Company', 'Company Name', 'company']),
            source_ip: request.headers.get('x-forwarded-for'),
            user_agent: request.headers.get('user-agent'),
            referrer: request.headers.get('referer'),
          })
          .select('id')
          .single()

        if (leadError) {
          console.error('Error creating lead:', leadError)
        }
        leadId = newLead?.id || null
      }

      if (leadId) {
        createdLeadId = leadId
        await admin
          .from('form_submissions')
          .update({ lead_id: leadId })
          .eq('id', submission.id)

        // Trigger qualification
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        fetch(`${appUrl}/api/qualify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        }).catch(() => {})
      }
    }

    // Fire Facebook Conversions API event if configured
    // Only fires for leads with email (qualified gate — no email = no pixel = clean seed)
    const fb = form.facebook as { pixel_id?: string; access_token?: string; test_event_code?: string } | undefined
    if (fb?.pixel_id && fb?.access_token && email) {
      const crypto = await import('crypto')
      const hash = (v: string) => v ? crypto.createHash('sha256').update(v.toLowerCase().trim()).digest('hex') : ''
      const eventId = submission.id
      const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
      const tracking = body.tracking || {}

      // Normalize phone: strip non-digits, add US country code if 10 digits
      const rawPhone = findField(submissionData, ['phone', 'Phone', 'Phone Number', 'phone_number']) || ''
      const phoneClean = rawPhone.replace(/\D/g, '')
      const phoneNorm = phoneClean.length === 10 ? '1' + phoneClean : phoneClean

      // Build fbc from fbclid if cookie wasn't captured
      let fbc = tracking.fbc || ''
      if (!fbc && tracking.fbclid) {
        fbc = `fb.1.${Date.now()}.${tracking.fbclid}`
      }

      // Build user_data with ALL 10 match keys for max EMQ score
      const userData: Record<string, unknown> = {}
      // HIGH PRIORITY
      if (email) userData.em = [hash(email)]
      if (phoneNorm) userData.ph = [hash(phoneNorm)]
      const fn = findField(submissionData, ['first_name', 'First Name', 'first name', 'name'])
      const ln = findField(submissionData, ['last_name', 'Last Name', 'last name'])
      if (fn) userData.fn = [hash(fn)]
      if (ln) userData.ln = [hash(ln)]
      // MEDIUM PRIORITY
      if (tracking.zip_code) userData.zp = [hash(tracking.zip_code)]
      if (tracking.country_code) userData.country = [hash(tracking.country_code.toLowerCase())]
      // BROWSER/DEVICE
      if (clientIp) userData.client_ip_address = clientIp
      if (request.headers.get('user-agent')) userData.client_user_agent = request.headers.get('user-agent')
      // META COOKIES (highest match rate)
      if (tracking.fbp) userData.fbp = tracking.fbp
      if (fbc) userData.fbc = fbc

      // Count match keys for EMQ tracking
      const matchKeysCount = Object.keys(userData).length

      // Get lead score if available (for Facebook optimization feedback loop)
      let leadScore = 0
      let leadTier = 'unscored'
      if (createdLeadId) {
        const { data: scoredLead } = await admin.from('leads').select('score, label').eq('id', createdLeadId).single()
        if (scoredLead) {
          leadScore = scoredLead.score || 0
          leadTier = scoredLead.label || 'unscored'
        }
      }

      const capiPayload = {
        data: [{
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: request.headers.get('referer') || undefined,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            content_name: 'Form_Submission',
            content_category: leadTier,
            currency: 'USD',
            // SCORE FEEDBACK: Facebook uses 'value' to optimize Lookalike
            // Higher-scoring leads = higher value = Facebook finds more of them
            value: leadScore,
            // Custom properties for audience segmentation in Events Manager
            lead_score: leadScore,
            lead_tier: leadTier,
            match_keys_count: matchKeysCount,
          },
        }],
        ...(fb.test_event_code ? { test_event_code: fb.test_event_code } : {}),
      }

      fetch(
        `https://graph.facebook.com/v21.0/${fb.pixel_id}/events?access_token=${fb.access_token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capiPayload),
        }
      ).catch((err) => console.error('CAPI error:', err))
    }

    // Fetch final lead score for client-side event
    let finalScore = 0
    if (createdLeadId) {
      const { data: sl } = await admin.from('leads').select('score').eq('id', createdLeadId).single()
      if (sl?.score) finalScore = sl.score
    }

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      lead_score: finalScore,
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
