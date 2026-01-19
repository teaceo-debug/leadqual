import { NextRequest, NextResponse } from 'next/server'
import { qualifyLead } from '@/lib/qualify'

// POST /api/qualify - Trigger qualification for a lead (internal)
export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    // Run qualification and wait for completion
    // (In serverless environments, async fire-and-forget doesn't work)
    const result = await qualifyLead(leadId)

    if (!result) {
      return NextResponse.json({ error: 'Qualification failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Qualification completed',
      score: result.score,
      label: result.label
    })
  } catch (error) {
    console.error('Qualification trigger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
