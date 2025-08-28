import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ACCESS_CODE = '0627'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      )
    }
    
    if (code !== ACCESS_CODE) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      )
    }
    
    // Set authentication cookie
    const cookieStore = await cookies()
    cookieStore.set('email-hub-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}