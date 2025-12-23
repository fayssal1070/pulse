import { NextResponse } from 'next/server'
import { generateCSVTemplate } from '@/lib/csv-templates'

export async function GET() {
  const csv = generateCSVTemplate()
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="pulse-import-template.csv"',
    },
  })
}

