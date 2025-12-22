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
    const organization = await getOrganizationById(id, user.id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

    const dateIdx = headers.indexOf('date')
    const providerIdx = headers.indexOf('provider')
    const serviceIdx = headers.indexOf('service')
    const amountIdx = headers.indexOf('amounteur')
    const currencyIdx = headers.indexOf('currency')

    if (
      dateIdx === -1 ||
      providerIdx === -1 ||
      serviceIdx === -1 ||
      amountIdx === -1 ||
      currencyIdx === -1
    ) {
      return NextResponse.json(
        { error: 'Invalid CSV format. Required columns: date, provider, service, amountEUR, currency' },
        { status: 400 }
      )
    }

    const costs = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      if (values.length < 5) continue

      const date = new Date(values[dateIdx])
      const provider = values[providerIdx]
      const service = values[serviceIdx]
      const amountEUR = parseFloat(values[amountIdx])
      const currency = values[currencyIdx]

      if (isNaN(date.getTime()) || isNaN(amountEUR)) continue

      costs.push({
        orgId: id,
        date,
        provider,
        service,
        amountEUR,
        currency,
      } as {
        orgId: string
        date: Date
        provider: string
        service: string
        amountEUR: number
        currency: string
      })
    }

    if (costs.length === 0) {
      return NextResponse.json(
        { error: 'No valid costs found in CSV' },
        { status: 400 }
      )
    }

    await prisma.costRecord.createMany({
      data: costs,
      skipDuplicates: true,
    })

    return NextResponse.json({ imported: costs.length })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

