import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      smartAccountAddress?: string | null
      publicKey?: string | null
      accountIndex?: number
    } & DefaultSession["user"]
  }

  interface User {
    smartAccountAddress?: string | null
    publicKey?: string | null
    accountIndex?: number
  }
}