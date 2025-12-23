import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { syncAWSCosts } from '@/lib/aws-cost-explorer'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { roleArn, externalId, organizationId } = await request.json()

    // Validate input
    if (!roleArn || !externalId || !organizationId) {
      return NextResponse.json(
        { error: 'Role ARN, External ID, and Organization ID are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const activeOrgId = await getActiveOrganizationId(user.id)
    if (activeOrgId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate Role ARN format
    const roleArnRegex = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/
    if (!roleArnRegex.test(roleArn)) {
      return NextResponse.json(
        { error: 'Invalid Role ARN format. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME' },
        { status: 400 }
      )
    }

    // Test connection by attempting to fetch a small amount of data
    try {
      const endDate = new Date()
      endDate.setHours(0, 0, 0, 0)
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 1) // Just yesterday for testing

      const result = await syncAWSCosts(roleArn, externalId, organizationId)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Connection test failed',
            message: result.error || 'Unable to connect to AWS. Please verify your Role ARN and External ID.',
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Connection successful! Found ${result.recordsCount} cost records.`,
        recordsCount: result.recordsCount,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Provide user-friendly error messages
      let userMessage = 'Connection test failed'
      if (errorMessage.includes('AccessDenied') || errorMessage.includes('UnauthorizedOperation')) {
        userMessage = 'Access denied. Please verify the Role ARN, External ID, and IAM permissions.'
      } else if (errorMessage.includes('InvalidUserID.NotFound')) {
        userMessage = 'Role not found. Please verify the Role ARN is correct.'
      } else if (errorMessage.includes('ExternalId')) {
        userMessage = 'External ID mismatch. Please ensure the External ID in the Trust Policy matches the one shown above.'
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          message: userMessage,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

