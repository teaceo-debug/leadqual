import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import crypto from 'crypto'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured, emails will not be sent')
    return null
  }
  return new Resend(apiKey)
}

// POST /api/team/invite - Send an invitation
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

    // Only admins can invite
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'manager', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', membership.organization_id)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a team member' },
          { status: 400 }
        )
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', membership.organization_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 400 }
      )
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        organization_id: membership.organization_id,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating invitation:', createError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Get organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', membership.organization_id)
      .single()

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
    const resend = getResendClient()

    if (resend) {
      try {
        await resend.emails.send({
          from: 'LeadScores <noreply@leadscores.com>',
          to: email,
          subject: `You've been invited to join ${org?.name || 'a team'} on LeadScores`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">You've been invited!</h1>
              <p style="color: #666; line-height: 1.6;">
                You've been invited to join <strong>${org?.name || 'a team'}</strong> on LeadScores as a <strong>${role}</strong>.
              </p>
              <p style="color: #666; line-height: 1.6;">
                Click the button below to accept the invitation:
              </p>
              <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
                Accept Invitation
              </a>
              <p style="color: #999; font-size: 14px; margin-top: 24px;">
                This invitation expires in 7 days.
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error('Team invite POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
