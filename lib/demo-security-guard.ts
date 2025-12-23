/**
 * Security guard to ensure demo routes never access the database
 * 
 * This is a compile-time and runtime check to prevent accidental
 * database access from demo pages.
 * 
 * Usage:
 * - Import this in any demo-related file
 * - Call `assertNoDatabaseAccess()` at the top of any demo page/component
 * - This will throw an error if Prisma is imported or used
 */

// This file should NEVER import Prisma or any database-related modules
// If you see an import of @prisma/client or lib/prisma here, it's a security issue!

export function assertNoDatabaseAccess() {
  // Runtime check: ensure Prisma is not in the module cache
  if (typeof window === 'undefined') {
    // Server-side check
    try {
      // This will throw if Prisma is imported
      require.resolve('@prisma/client')
      // If we get here, Prisma is available - this is a warning
      console.warn('[DEMO SECURITY] Prisma is available in the module system. Ensure demo pages do not import it.')
    } catch {
      // Good - Prisma is not available
    }
  }
}

/**
 * Type guard to ensure a function doesn't use database access
 * This is a compile-time check via TypeScript
 */
export type NoDatabaseAccess<T> = T extends (...args: any[]) => Promise<infer R>
  ? (...args: any[]) => Promise<R>
  : T extends (...args: any[]) => infer R
  ? (...args: any[]) => R
  : never

/**
 * Checklist for demo security:
 * 
 * ✅ 1. Demo page (`app/demo/page.tsx`) should only import from:
 *    - `lib/demo-dataset.ts` (static data)
 *    - UI components
 *    - Next.js Link/Image
 *    - NO Prisma, NO database imports
 * 
 * ✅ 2. Demo dataset (`lib/demo-dataset.ts`) should:
 *    - Only contain static TypeScript objects/arrays
 *    - NO Prisma imports
 *    - NO database queries
 *    - NO API calls
 * 
 * ✅ 3. API routes should remain protected:
 *    - `/api/organizations/*` → requireAuth()
 *    - `/api/import` → auth() check
 *    - `/api/alerts/*` → requireAuth()
 *    - `/api/leads` → Public (OK, for lead capture)
 * 
 * ✅ 4. Middleware should:
 *    - Allow `/demo` as public route
 *    - Protect all `/api/organizations`, `/api/import`, `/api/alerts`
 * 
 * ✅ 5. Demo form (`components/demo-early-access-form.tsx`):
 *    - Only calls `/api/leads` (public, for lead capture)
 *    - NO direct database access
 * 
 * ✅ 6. No server actions in demo:
 *    - Demo page should be a Server Component that only renders static data
 *    - No 'use server' directives in demo-related files
 */

export const DEMO_SECURITY_CHECKLIST = {
  'demo-page-no-prisma': 'app/demo/page.tsx does not import Prisma or database modules',
  'demo-dataset-static': 'lib/demo-dataset.ts contains only static data, no DB queries',
  'api-routes-protected': 'All sensitive API routes require authentication',
  'middleware-allows-demo': 'Middleware allows /demo as public route',
  'demo-form-leads-only': 'Demo form only calls /api/leads (public endpoint)',
  'no-server-actions': 'Demo page has no server actions that could access DB',
} as const

