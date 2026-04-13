import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/forms/public/[slug] - Get a published form by slug (no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const admin = createAdminClient()

    const { data: form, error } = await admin
      .from('forms')
      .select('id, name, description, slug, fields, thank_you_title, thank_you_message, redirect_url')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({ form })
  } catch (error) {
    console.error('Public form GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
