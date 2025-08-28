import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const emailOptions = {
      from: 'onboarding@resend.dev',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html), // Ensure text is always a string
    }

    const result = await resend.emails.send(emailOptions)
    return { success: true, data: result }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Simple function to strip HTML tags and create plain text fallback
function stripHtml(html: string): string {
  // Remove HTML tags and decode basic entities
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace encoded ampersands
    .replace(/&lt;/g, '<') // Replace encoded less-than
    .replace(/&gt;/g, '>') // Replace encoded greater-than
    .replace(/&quot;/g, '"') // Replace encoded quotes
    .replace(/&#39;/g, "'") // Replace encoded apostrophes
    .replace(/\s+/g, ' ') // Replace multiple whitespaces with single space
    .trim() // Remove leading/trailing whitespace
}

export async function sendCampaignEmails(
  contacts: Array<{ email: string; first_name?: string; last_name?: string }>,
  template: { subject: string; content: string }
) {
  const results = []
  
  for (const contact of contacts) {
    // Personalize the email content
    const personalizedSubject = template.subject
      .replace(/\{\{first_name\}\}/g, contact.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    
    const personalizedContent = template.content
      .replace(/\{\{first_name\}\}/g, contact.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    
    const result = await sendEmail({
      to: [contact.email],
      subject: personalizedSubject,
      html: personalizedContent,
      text: stripHtml(personalizedContent) // Always provide text version
    })
    
    results.push({
      email: contact.email,
      success: result.success,
      error: result.error
    })
  }
  
  return results
}