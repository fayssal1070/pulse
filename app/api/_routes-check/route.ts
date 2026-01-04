/**
 * Routes check endpoint - debug helper
 * GET /api/_routes-check
 * Returns information about route existence
 */

import { NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const baseDir = 'app' // Project uses app/ not src/app/
  const projectRoot = process.cwd()

  // Check file existence via fs (not imports)
  const hasAiRequestRoute = existsSync(join(projectRoot, 'app', 'api', 'ai', 'request', 'route.ts'))
  const hasAdminAiPage = existsSync(join(projectRoot, 'app', 'admin', 'integrations', 'ai', 'page.tsx'))
  const hasV1ChatCompletions = existsSync(join(projectRoot, 'app', 'api', 'v1', 'chat', 'completions', 'route.ts'))

  return NextResponse.json({
    ok: true,
    hasAiRequestRoute,
    hasAdminAiPage,
    hasV1ChatCompletions,
    baseDir,
    routes: {
      aiRequest: '/api/ai/request',
      adminAiIntegrations: '/admin/integrations/ai',
      v1ChatCompletions: '/api/v1/chat/completions',
    },
    paths: {
      aiRequestRoute: 'app/api/ai/request/route.ts',
      adminAiPage: 'app/admin/integrations/ai/page.tsx',
      v1ChatCompletionsRoute: 'app/api/v1/chat/completions/route.ts',
    },
    checks: {
      projectStructure: 'app/',
      apiRoutesPath: 'app/api/',
      adminPagesPath: 'app/admin/',
      note: 'Make sure you are calling /api/ai/request (not /api/request)',
    },
  })
}

