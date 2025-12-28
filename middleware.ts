import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware qui vérifie directement les cookies sans importer Prisma
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Early return for /api/build-info - must be excluded completely
  if (pathname === '/api/build-info') {
    return NextResponse.next()
  }
  
  // Vérifier le cookie de session NextAuth
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value
  
  const isLoggedIn = !!sessionToken

  // Routes publiques
  const publicRoutes = ['/', '/pricing', '/security', '/contact', '/about', '/login', '/register', '/thank-you', '/thanks', '/onboarding', '/demo', '/help']
  const isPublicRoute = publicRoutes.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/build-info') || // Public build info endpoint
    pathname.startsWith('/api/admin/check') || // Admin check endpoint (protected by auth in route)
    pathname.startsWith('/invitations/') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/help/') // Help pages (protected by auth in page itself)

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Routes protégées
  const protectedRoutes = ['/dashboard', '/organizations', '/team', '/import', '/alerts', '/budget', '/notifications', '/admin', '/accounts']
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /api/build-info (public build info endpoint - excluded from middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/build-info|_next/static|_next/image|favicon.ico).*)',
  ],
}
