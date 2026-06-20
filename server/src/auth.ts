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
  })
}
