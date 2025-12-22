import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { isOrganizationOwner } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

// Check if user is owner
async function requireOwner() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const isOwner = await Promise.all(
    organizations.map(org => isOrganizationOwner(org.id, user.id))
  ).then(results => results.some(r => r))

  if (!isOwner) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner()
    const { id } = await params
    const { archived } = await request.json()

    const lead = await prisma.lead.update({
      where: { id },
      data: { archived: archived === true },
    })

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    console.error('Lead update error:', error)
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
    await requireOwner()
    const { id } = await params

    await prisma.lead.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    console.error('Lead deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

