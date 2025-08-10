import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import type { NextAuthOptions } from "next-auth"
import { generateKeyPairFromEmail, generateSmartAccountAddress } from "@/lib/auth-utils"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        
        // Add smart account data to session
        let dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { smartAccountAddress: true, publicKey: true, accountIndex: true }
        })
        
        // If no smart account data, generate it deterministically
        if (!dbUser?.smartAccountAddress && session.user.email) {
          const { publicKey } = await generateKeyPairFromEmail(session.user.email)
          const smartAccountAddress = await generateSmartAccountAddress(session.user.email, 0)
          
          // Update database with generated data
          await prisma.user.update({
            where: { id: user.id },
            data: {
              smartAccountAddress,
              publicKey,
              accountIndex: 0,
            }
          })
          
          dbUser = { smartAccountAddress, publicKey, accountIndex: 0 }
        }
        
        if (dbUser) {
          session.user.smartAccountAddress = dbUser.smartAccountAddress
          session.user.publicKey = dbUser.publicKey
          session.user.accountIndex = dbUser.accountIndex
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: "database",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }