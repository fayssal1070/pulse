import { NextResponse } from 'next/server'

export async function GET() {
  // Return PULSE AWS Principal ARN from environment variable
  // Set in Vercel: PULSE_AWS_PRINCIPAL_ARN = arn:aws:iam::298199649603:root
  const principalArn = process.env.PULSE_AWS_PRINCIPAL_ARN || 'arn:aws:iam::298199649603:root'

  return NextResponse.json({ principalArn })
}

