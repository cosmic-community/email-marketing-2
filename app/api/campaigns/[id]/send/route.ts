// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus } from '@/lib/cosmic'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Get the campaign
    const campaign = await getMarketingCampaign(id)
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check if campaign is in draft status
    if (campaign.metadata?.status?.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be sent' },
        { status: 400 }
      )
    }

    // Validate template and contacts
    const template = campaign.metadata?.template
    const targetContacts = campaign.metadata?.target_contacts || []

    if (!template || !template.metadata) {
      return NextResponse.json(
        { error: 'Campaign template is required' },
        { status: 400 }
      )
    }

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'At least one contact is required' },
        { status: 400 }
      )
    }

    // Initialize Resend client (this will throw an error if API key is missing)
    const resendClient = resend()

    // Send emails to all target contacts
    let sentCount = 0
    let deliveredCount = 0
    let bouncedCount = 0
    const errors: string[] = []

    for (const contact of targetContacts) {
      try {
        // Personalize email content
        let emailContent = template.metadata.content || ''
        let emailSubject = template.metadata.subject || ''

        // Replace template variables with contact data
        if (contact.metadata?.first_name) {
          emailContent = emailContent.replace(/\{\{first_name\}\}/g, contact.metadata.first_name)
          emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, contact.metadata.first_name)
        }
        if (contact.metadata?.last_name) {
          emailContent = emailContent.replace(/\{\{last_name\}\}/g, contact.metadata.last_name)
          emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, contact.metadata.last_name)
        }

        // Send email via Resend
        const emailResult = await resendClient.emails.send({
          from: 'onboarding@resend.dev', // Use your verified domain
          to: [contact.metadata?.email || ''],
          subject: emailSubject,
          html: emailContent,
        })

        if (emailResult.data) {
          sentCount++
          deliveredCount++
        }
      } catch (emailError) {
        bouncedCount++
        errors.push(`Failed to send to ${contact.metadata?.email}: ${emailError}`)
        console.error(`Failed to send email to ${contact.metadata?.email}:`, emailError)
      }
    }

    // Calculate stats
    const openRate = sentCount > 0 ? '0%' : '0%' // Will be updated by email tracking
    const clickRate = sentCount > 0 ? '0%' : '0%' // Will be updated by email tracking

    const stats = {
      sent: sentCount,
      delivered: deliveredCount,
      opened: 0, // Will be updated by email tracking
      clicked: 0, // Will be updated by email tracking
      bounced: bouncedCount,
      unsubscribed: 0,
      open_rate: openRate,
      click_rate: clickRate
    }

    // Update campaign status to 'Sent'
    await updateCampaignStatus(id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully! ${sentCount} emails sent, ${bouncedCount} bounced.`,
      stats,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error sending campaign:', error)
    
    // Handle specific Resend API key error
    if (error instanceof Error && error.message.includes('RESEND_API_KEY')) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please add your Resend API key.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}