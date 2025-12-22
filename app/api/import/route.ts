import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

interface RejectedLine {
  line: number
  reason: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function validateDate(dateStr: string): { valid: boolean; date?: Date; reason?: string } {
  if (!dateStr || dateStr.trim() === '') {
    return { valid: false, reason: 'Date is empty' }
  }

  // Format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) {
    return { valid: false, reason: `Invalid date format. Expected YYYY-MM-DD, got: ${dateStr}` }
  }

  const date = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(date.getTime())) {
    return { valid: false, reason: `Invalid date: ${dateStr}` }
  }

  return { valid: true, date }
}

function validateProvider(provider: string): { valid: boolean; reason?: string } {
  if (!provider || provider.trim() === '') {
    return { valid: false, reason: 'Provider is empty' }
  }

  const validProviders = ['AWS', 'GCP', 'Azure', 'Other']
  if (!validProviders.includes(provider.trim())) {
    return {
      valid: false,
      reason: `Invalid provider. Must be one of: ${validProviders.join(', ')}, got: ${provider}`,
    }
  }

  return { valid: true }
}

function validateService(service: string): { valid: boolean; reason?: string } {
  if (!service || service.trim() === '') {
    return { valid: false, reason: 'Service is empty' }
  }
  return { valid: true }
}

function validateAmountEUR(amountStr: string): { valid: boolean; amount?: number; reason?: string } {
  if (!amountStr || amountStr.trim() === '') {
    return { valid: false, reason: 'amountEUR is empty' }
  }

  const amount = parseFloat(amountStr.trim())
  if (isNaN(amount)) {
    return { valid: false, reason: `amountEUR is not a valid number: ${amountStr}` }
  }

  if (amount < 0) {
    return { valid: false, reason: `amountEUR must be positive, got: ${amount}` }
  }

  return { valid: true, amount }
}

function validateCurrency(currency: string): { valid: boolean; reason?: string } {
  if (!currency || currency.trim() === '') {
    return { valid: false, reason: 'Currency is empty' }
  }
  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user

    // Récupérer l'organisation active
    const orgId = await getActiveOrganizationId(user.id)
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found. Please select an organization first.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 })
    }

    // Valider les headers
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase())

    const requiredHeaders = ['date', 'provider', 'service', 'amounteur', 'currency']
    const headerIndices: Record<string, number> = {}

    for (const required of requiredHeaders) {
      const idx = headers.indexOf(required)
      if (idx === -1) {
        return NextResponse.json(
          {
            error: `Missing required column: ${required}. Found columns: ${headers.join(', ')}`,
          },
          { status: 400 }
        )
      }
      headerIndices[required] = idx
    }

    // Parser et valider les lignes
    const validRecords: Array<{
      orgId: string
      date: Date
      provider: string
      service: string
      amountEUR: number
      currency: string
    }> = []
    const rejectedLines: RejectedLine[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue // Skip empty lines

      const values = parseCSVLine(line)

      if (values.length < requiredHeaders.length) {
        rejectedLines.push({
          line: i + 1,
          reason: `Insufficient columns. Expected ${requiredHeaders.length}, got ${values.length}`,
        })
        continue
      }

      const dateStr = values[headerIndices.date]
      const provider = values[headerIndices.provider]
      const service = values[headerIndices.service]
      const amountStr = values[headerIndices.amounteur]
      const currency = values[headerIndices.currency]

      // Valider chaque champ
      const dateValidation = validateDate(dateStr)
      const providerValidation = validateProvider(provider)
      const serviceValidation = validateService(service)
      const amountValidation = validateAmountEUR(amountStr)
      const currencyValidation = validateCurrency(currency)

      const errors: string[] = []
      if (!dateValidation.valid) errors.push(dateValidation.reason!)
      if (!providerValidation.valid) errors.push(providerValidation.reason!)
      if (!serviceValidation.valid) errors.push(serviceValidation.reason!)
      if (!amountValidation.valid) errors.push(amountValidation.reason!)
      if (!currencyValidation.valid) errors.push(currencyValidation.reason!)

      if (errors.length > 0) {
        rejectedLines.push({
          line: i + 1,
          reason: errors.join('; '),
        })
        continue
      }

      // Tous les champs sont valides
      validRecords.push({
        orgId,
        date: dateValidation.date!,
        provider: provider.trim(),
        service: service.trim(),
        amountEUR: amountValidation.amount!,
        currency: currency.trim(),
      })
    }

    // Insérer les enregistrements valides
    let importedCount = 0
    if (validRecords.length > 0) {
      await prisma.costRecord.createMany({
        data: validRecords,
        skipDuplicates: true,
      })
      importedCount = validRecords.length
    }

    // Retourner les résultats
    return NextResponse.json({
      importedCount,
      rejectedCount: rejectedLines.length,
      rejectedSamples: rejectedLines.slice(0, 10), // Limiter à 10 exemples
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

