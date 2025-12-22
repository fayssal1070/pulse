import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { budgetMonthlyEUR } = await request.json()

    // Vérifier que l'utilisateur a accès à cette organisation
    const organization = await getOrganizationById(id, user.id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 403 }
      )
    }

    // Mettre à jour le budget
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        budgetMonthlyEUR: budgetMonthlyEUR === null || budgetMonthlyEUR === '' ? null : parseFloat(budgetMonthlyEUR),
      },
    })

    return NextResponse.json({
      success: true,
      budgetMonthlyEUR: updated.budgetMonthlyEUR,
    })
  } catch (error) {
    console.error('Budget update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

