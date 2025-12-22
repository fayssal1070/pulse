import Credentials from 'next-auth/providers/credentials'

export const credentialsProvider = Credentials({
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      console.log('❌ Missing credentials')
      return null
    }

    try {
      // Import dynamique pour éviter l'import dans Edge Runtime
      const { prisma } = await import('./prisma')
      const authModule = await import('./auth')
      const { verifyPassword } = authModule
      
      console.log('🔍 Auth attempt:', { email: credentials.email })
      
      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      })

      if (!user) {
        console.log('❌ User not found:', credentials.email)
        return null
      }

      console.log('✅ User found, verifying password...')
      const isValid = await verifyPassword(
        credentials.password as string,
        user.passwordHash
      )

      if (!isValid) {
        console.log('❌ Invalid password')
        return null
      }

      console.log('✅ Authentication successful')
      return {
        id: user.id,
        email: user.email,
      }
    } catch (error) {
      console.error('❌ Auth error:', error)
      return null
    }
  },
})

