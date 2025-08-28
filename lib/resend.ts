import { Resend } from 'resend'

// Initialize Resend client lazily to avoid build-time errors
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export { getResendClient as resend }