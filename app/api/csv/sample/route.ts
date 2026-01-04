import { NextResponse } from 'next/server'
import { generateSampleCSV } from '@/lib/csv-templates'

export async function GET() {
  const csv = generateSampleCSV()
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="pulse-sample-data.csv"',
    },
  })
}





