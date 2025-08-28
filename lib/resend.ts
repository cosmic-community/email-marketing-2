import { Resend } from 'resend'

// Don't check environment variable at import time - check when resend is used
let resendInstance: Resend | null = null

function getResendInstance(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

export const resend = {
  emails: {
    send: (options: SendEmailOptions) => {
      return getResendInstance().emails.send(options)
    }
  }
}

// Type definitions for Resend API responses based on actual Resend library types
export interface SendEmailOptions {
  from: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string
}

// The Resend library returns a Promise that resolves to either success data or throws an error
export interface ResendSuccessResponse {
  id: string
}

export interface ResendErrorResponse {
  message: string
  name: string
}