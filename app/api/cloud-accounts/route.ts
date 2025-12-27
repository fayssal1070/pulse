import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { getUserOrganizations } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    // Get all organizations user has access to
    const organizations = await getUserOrganizations(user.id)
    const orgIds = organizations.map((o) => o.id)

    if (orgIds.length === 0) {
      return NextResponse.json({ accounts: [] })
    }

    // Filter by orgId if provided, otherwise get all
    // Ensure the requested orgId is in the user's orgs
    const where = orgId
      ? { orgId: orgIds.includes(orgId) ? orgId : { in: [] } } // If orgId not in user's orgs, return empty
      : { orgId: { in: orgIds } }

    const accounts = await prisma.cloudAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Get cloud accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const {
      provider,
      accountName,
      accountIdentifier,
      connectionType,
      roleArn,
      externalId,
      organizationId,
      notes,
    } = await request.json()

    // Use provided organizationId or get active org
    let orgId = organizationId
    if (!orgId) {
      orgId = await getActiveOrganizationId(user.id)
      if (!orgId) {
        return NextResponse.json(
          { error: 'No active organization found. Please select an organization first.' },
          { status: 400 }
        )
      }
    }

    // Verify user has access to this organization
    const { getUserOrganizations } = await import('@/lib/organizations')
    const organizations = await getUserOrganizations(user.id)
    if (!organizations.find((o) => o.id === orgId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check entitlements
    try {
      const { assertCanCreateCloudAccount } = await import('@/lib/entitlements')
      await assertCanCreateCloudAccount(orgId)
    } catch (error: any) {
      if (error.message?.includes('LIMIT_REACHED')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'LIMIT_REACHED',
          },
          { status: 402 }
        )
      }
      throw error
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

    // For AWS Cost Explorer, require roleArn and externalId
    if (connectionType === 'COST_EXPLORER' && provider === 'AWS') {
      if (!roleArn || !externalId) {
        return NextResponse.json(
          { error: 'Role ARN and External ID are required for AWS Cost Explorer' },
          { status: 400 }
        )
      }
    }

    const cloudAccount = await prisma.cloudAccount.create({
      data: {
        orgId,
        provider,
        accountName: accountName.trim(),
        accountIdentifier: accountIdentifier?.trim() || null,
        connectionType: connectionType || null,
        roleArn: roleArn?.trim() || null,
        externalId: externalId?.trim() || null,
        notes: notes?.trim() || null,
        status: connectionType === 'COST_EXPLORER' ? 'pending' : 'pending',
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

