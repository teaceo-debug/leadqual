import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/forms/[id]/submit - Public form submission (no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createAdminClient()

    // Fetch the form
    const { data: form, error: formError } = await admin
      .from('forms')
      .select('*')
      .eq('id', params.id)
      .eq('status', 'published')
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
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
      .update({ submission_count: (form.submission_count || 0) + 1 })
      .eq('id', form.id)

    // Try to create a lead from the submission data if email exists
    const email = submissionData.email || submissionData.Email
    if (email) {
      const { data: lead } = await admin
        .from('leads')
        .insert({
          organization_id: form.organization_id,
          email,
          first_name: submissionData.first_name || submissionData['First Name'] || null,
          last_name: submissionData.last_name || submissionData['Last Name'] || null,
          phone: submissionData.phone || submissionData.Phone || null,
          company_name: submissionData.company_name || submissionData['Company'] || null,
          source_ip: request.headers.get('x-forwarded-for'),
          user_agent: request.headers.get('user-agent'),
          referrer: request.headers.get('referer'),
        })
        .select('id')
        .single()

      if (lead) {
        await admin
          .from('form_submissions')
          .update({ lead_id: lead.id })
          .eq('id', submission.id)

        // Trigger qualification
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        fetch(`${appUrl}/api/qualify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id }),
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
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
