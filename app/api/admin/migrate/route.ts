import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/admin/migrate
 * Apply Prisma migrations (admin only)
 * This endpoint allows applying migrations manually after deployment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const isAdminUser = await isAdmin()

    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Apply migrations
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        env: { ...process.env },
        timeout: 60000, // 60 seconds timeout
      })

      return NextResponse.json({
        success: true,
        message: 'Migrations applied successfully',
        output: stdout,
        warnings: stderr || undefined,
      })
    } catch (error: any) {
      console.error('Migration error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to apply migrations',
          output: error.stdout || undefined,
          stderr: error.stderr || undefined,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Admin migrate endpoint error:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

