import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      company,
      role,
      cloudProvider,
      monthlyCloudSpendRange,
      message,
      honeypot, // Anti-spam honeypot field
    } = body

    // Honeypot check - if filled, it's a bot
    if (honeypot) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!email || !company) {
      return NextResponse.json(
        { error: 'Email and company are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const rateLimit = checkRateLimit(`lead:${ip}`, 5, 60 * 60 * 1000) // 5 requests per hour

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    // Check if email already exists (prevent duplicates)
    const existingLead = await prisma.lead.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        archived: false,
      },
    })

    if (existingLead) {
      // Update existing lead instead of creating duplicate
      const updated = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          company: company.trim(),
          role: role?.trim() || null,
          cloudProvider: cloudProvider || null,
          monthlyCloudSpendRange: monthlyCloudSpendRange || null,
          message: message?.trim() || null,
        },
      })

      return NextResponse.json({
        success: true,
        leadId: updated.id,
        message: 'Thank you! We will be in touch soon.',
      })
    }

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        email: email.toLowerCase().trim(),
        company: company.trim(),
        role: role?.trim() || null,
        cloudProvider: cloudProvider || null,
        monthlyCloudSpendRange: monthlyCloudSpendRange || null,
        message: message?.trim() || null,
      },
    })

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Thank you! We will be in touch soon.',
    })
  } catch (error) {
    console.error('Lead submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

