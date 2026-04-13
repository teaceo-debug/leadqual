import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/forms/[id]/view - Track a form view (public, no auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const body = await request.json().catch(() => ({}))
    const utm = body.utm || {}

    await admin.from('form_views').insert({
      form_id: id,
      source_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
    })

    // Increment view count — fetch current then update
    const { data: form } = await admin.from('forms').select('view_count').eq('id', id).single()
    if (form) {
      await admin.from('forms').update({ view_count: (form.view_count || 0) + 1 }).eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true }) // Never fail on view tracking
  }
}
