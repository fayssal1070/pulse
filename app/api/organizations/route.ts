import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { createOrganization } from '@/lib/organizations'

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    const organization = await createOrganization(userId, name)

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

