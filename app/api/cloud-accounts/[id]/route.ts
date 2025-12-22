import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { status } = await request.json()

    // Validate status
    const validStatuses = ['pending', 'active', 'disabled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get account and verify user has access
    const account = await prisma.cloudAccount.findUnique({
      where: { id },
      include: { organization: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cloud account not found' },
        { status: 404 }
      )
    }

    const organization = await getOrganizationById(account.orgId, user.id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updated = await prisma.cloudAccount.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, cloudAccount: updated })
  } catch (error) {
    console.error('Cloud account update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Get account and verify user has access
    const account = await prisma.cloudAccount.findUnique({
      where: { id },
      include: { organization: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cloud account not found' },
        { status: 404 }
      )
    }

    const organization = await getOrganizationById(account.orgId, user.id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await prisma.cloudAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cloud account deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

