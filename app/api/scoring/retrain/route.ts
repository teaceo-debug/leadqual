import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateScoringModel, getModelStats } from '@/lib/learn'

// POST /api/scoring/retrain - Manually trigger model retraining (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user's organization and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Only admins can trigger retraining
    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 })
    }

    // Trigger retraining
    const result = await updateScoringModel(member.organization_id)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: member.organization_id,
      user_id: user.id,
      action: 'model.retrained',
      details: {
        model_version: result.model?.modelVersion,
        trained_on_count: result.model?.trainedOnCount,
        accuracy: result.model?.performanceMetrics?.accuracy,
      },
    })

    return NextResponse.json({
      success: true,
      model: result.model,
    })
  } catch (error) {
    console.error('Error retraining model:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/scoring/retrain - Get model stats and retraining status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user's organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get model stats
    const stats = await getModelStats(member.organization_id)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching model stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
