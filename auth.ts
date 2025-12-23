import NextAuth from 'next-auth'
import { credentialsProvider } from './lib/auth-provider'

// Configuration complète avec providers (utilisée dans les routes API)
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [credentialsProvider],
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
    // Important: error doit pointer vers une page UI, pas une route API
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  // Minimal logging using supported NextAuth v5 events
  events: {
    async signIn(message) {
      console.log('[auth][signIn]', {
        userId: message.user?.id,
        email: message.user?.email,
      })
    },
    async signOut() {
      console.log('[auth][signOut]')
    },
  },
  // Supporte AUTH_SECRET ou NEXTAUTH_SECRET sans fuite de valeur
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Trust host for preview deployments (URLs change per deploy)
  // NEXTAUTH_URL should only be set for Production with stable domain
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
})
