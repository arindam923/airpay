import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { getDB } from "./db"
import * as schema from "./db/schema"

type AuthConfig = {
  binding: D1Database
  url: string
  secret: string
  frontendUrl: string
  googleClientId?: string
  googleClientSecret?: string
}

export function createAuth(cfg: AuthConfig) {
  const db = getDB(cfg.binding)

  const socialProviders: Record<string, unknown> = {}

  if (cfg.googleClientId && cfg.googleClientSecret) {
    socialProviders.google = {
      clientId: cfg.googleClientId,
      clientSecret: cfg.googleClientSecret,
    }
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    baseURL: cfg.url,
    secret: cfg.secret,
    trustedOrigins: [cfg.frontendUrl, "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    socialProviders,
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser: { id: string; name?: string | null; email?: string | null }) => {
            try {
              const hookDB = getDB(cfg.binding)
              const now = new Date()
              const businessName =
                (createdUser.name && createdUser.name.trim()) ||
                (createdUser.email && createdUser.email.split("@")[0]) ||
                "New Merchant"
              await hookDB.insert(schema.merchantProfiles).values({
                id: crypto.randomUUID(),
                userId: createdUser.id,
                businessName,
                feeType: "part_of",
                feePercentage: 200,
                webhookUrl: null,
                webhookSecret: null,
                sandboxMode: true,
                createdAt: now,
                updatedAt: now,
              })
            } catch (err) {
              console.error("Failed to auto-create merchant profile for user", createdUser.id, err)
            }
          },
        },
      },
    },
  })
}
