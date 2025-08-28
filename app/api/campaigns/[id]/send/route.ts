// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus } from '@/lib/cosmic'
import { resend } from '@/lib/resend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the campaign
    const campaign = await getMarketingCampaign(id)
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign can be sent
    if (campaign.metadata?.status?.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Campaign can only be sent from Draft status' },
        { status: 400 }
      )
    }

    // Get target contacts
    const targetContacts = campaign.metadata?.target_contacts || []
    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No target contacts found' },
        { status: 400 }
      )
    }

    // Get email template content
    const template = campaign.metadata?.template
    if (!template?.metadata) {
      return NextResponse.json(
        { error: 'Campaign template not found' },
        { status: 400 }
      )
    }

    let sentCount = 0
    let bouncedCount = 0

    // Send emails to each contact
    for (const contact of targetContacts) {
      try {
        // Replace template variables with contact data
        let emailContent = template.metadata.content || ''
        let emailSubject = template.metadata.subject || ''
        
        emailContent = emailContent.replace(/\{\{first_name\}\}/g, contact.metadata?.first_name || 'Friend')
        emailContent = emailContent.replace(/\{\{last_name\}\}/g, contact.metadata?.last_name || '')
        emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, contact.metadata?.first_name || 'Friend')
        emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, contact.metadata?.last_name || '')

        // Send email via Resend
        await resend.emails.send({
          from: 'Email Marketing <noreply@yourdomain.com>',
          to: [contact.metadata?.email || ''],
          subject: emailSubject,
          html: emailContent,
        })

        sentCount++
      } catch (emailError) {
        console.error(`Failed to send email to ${contact.metadata?.email}:`, emailError)
        bouncedCount++
      }
    }

    // Update campaign status and stats
    const stats = {
      sent: sentCount,
      delivered: sentCount,
      opened: 0,
      clicked: 0,
      bounced: bouncedCount,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    await updateCampaignStatus(id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully to ${sentCount} recipients`,
      stats
    })

  } catch (error) {
    console.error('Error sending campaign:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}