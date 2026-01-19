import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Lead } from '@/types'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured, emails will not be sent')
    return null
  }
  resendClient = new Resend(apiKey)
  return resendClient
}

interface HotLeadEmailData {
  lead: Partial<Lead>
  score: number
  reasoning: string
  recommendedAction: string
}

/**
 * Send email notification for a hot lead to all admins and managers
 */
export async function sendHotLeadNotification(
  organizationId: string,
  data: HotLeadEmailData
): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const supabase = createAdminClient()

  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // Get all admins and managers with their emails
  const { data: members } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      role
    `)
    .eq('organization_id', organizationId)
    .in('role', ['admin', 'manager'])

  if (!members || members.length === 0) return

  // Get user emails from auth
  const userIds = members.map(m => m.user_id)
  const { data: users } = await supabase.auth.admin.listUsers()

  const recipientEmails = users?.users
    .filter(u => userIds.includes(u.id) && u.email)
    .map(u => u.email as string) || []

  if (recipientEmails.length === 0) return

  const leadName = `${data.lead.first_name || ''} ${data.lead.last_name || ''}`.trim() || 'Unknown'
  const companyName = data.lead.company_name || 'Unknown Company'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadscores.com'

  // Send email to each recipient
  const emailPromises = recipientEmails.map(async (email) => {
    try {
      await resend.emails.send({
        from: 'LeadScores <notifications@leadscores.com>',
        to: email,
        subject: `🔥 Hot Lead Alert: ${leadName} from ${companyName} (Score: ${data.score})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: #2563eb; color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold;">
                LS
              </div>
              <span style="font-size: 20px; font-weight: bold; margin-left: 10px;">LeadScores</span>
            </div>

            <div style="background: linear-gradient(135deg, #22c55e20, #22c55e10); border: 1px solid #22c55e40; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                <div style="background: #22c55e; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">
                  ${data.score}
                </div>
                <div>
                  <h2 style="margin: 0; color: #1a1a1a; font-size: 24px;">${leadName}</h2>
                  <p style="margin: 4px 0 0; color: #666; font-size: 16px;">${data.lead.job_title || 'Unknown Role'} at ${companyName}</p>
                </div>
                <span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; margin-left: auto;">HOT</span>
              </div>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px;">Contact Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 100px;">Email:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;"><a href="mailto:${data.lead.email}" style="color: #2563eb; text-decoration: none;">${data.lead.email}</a></td>
                </tr>
                ${data.lead.phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Phone:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;"><a href="tel:${data.lead.phone}" style="color: #2563eb; text-decoration: none;">${data.lead.phone}</a></td>
                </tr>
                ` : ''}
                ${data.lead.company_website ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Website:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;"><a href="${data.lead.company_website}" style="color: #2563eb; text-decoration: none;">${data.lead.company_website}</a></td>
                </tr>
                ` : ''}
                ${data.lead.company_size ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Size:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${data.lead.company_size}</td>
                </tr>
                ` : ''}
                ${data.lead.industry ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Industry:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${data.lead.industry}</td>
                </tr>
                ` : ''}
                ${data.lead.budget_range ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Budget:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${data.lead.budget_range}</td>
                </tr>
                ` : ''}
                ${data.lead.timeline ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Timeline:</td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${data.lead.timeline}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${data.lead.challenge ? `
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px;">Their Challenge</h3>
              <p style="margin: 0; color: #666; line-height: 1.6;">${data.lead.challenge}</p>
            </div>
            ` : ''}

            <div style="background: #f0fdf4; border: 1px solid #22c55e40; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px; color: #166534; font-size: 16px;">AI Analysis</h3>
              <p style="margin: 0 0 16px; color: #166534; line-height: 1.6;">${data.reasoning}</p>
              <div style="background: white; border-radius: 8px; padding: 12px; border: 1px solid #22c55e40;">
                <strong style="color: #166534;">Recommended Action:</strong>
                <p style="margin: 8px 0 0; color: #166534;">${data.recommendedAction}</p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${appUrl}/leads" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
                View Lead in Dashboard →
              </a>
            </div>

            <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 14px; margin: 0;">
                This notification was sent by <a href="${appUrl}" style="color: #2563eb; text-decoration: none;">LeadScores</a> for ${org?.name || 'your organization'}.
              </p>
            </div>
          </div>
        `,
      })
    } catch (error) {
      console.error(`Failed to send hot lead email to ${email}:`, error)
    }
  })

  await Promise.all(emailPromises)
}
