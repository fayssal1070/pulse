import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware qui vérifie directement les cookies sans importer Prisma
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Vérifier le cookie de session NextAuth
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value
  
  const isLoggedIn = !!sessionToken

  // Routes publiques
  const publicRoutes = ['/', '/pricing', '/security', '/contact', '/about', '/login', '/register', '/thank-you', '/thanks', '/onboarding', '/demo']
  const isPublicRoute = publicRoutes.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/invitations/') ||
    pathname.startsWith('/api/leads')

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
