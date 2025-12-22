import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { provider, accountName, accountIdentifier, notes } = await request.json()

    // Récupérer l'organisation active
    const orgId = await getActiveOrganizationId(user.id)
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found. Please select an organization first.' },
        { status: 400 }
      )
    }

    if (!provider || !accountName) {
      return NextResponse.json(
        { error: 'Provider and account name are required' },
        { status: 400 }
      )
    }

    // Validate provider
    const validProviders = ['AWS', 'GCP', 'Azure', 'Other']
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    const cloudAccount = await prisma.cloudAccount.create({
      data: {
        orgId,
        provider,
        accountName: accountName.trim(),
        accountIdentifier: accountIdentifier?.trim() || null,
        notes: notes?.trim() || null,
        status: 'pending',
      },
    })

    return NextResponse.json({ success: true, cloudAccount })
  } catch (error) {
    console.error('Cloud account creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

